-- Feito! · Migração 004 — fotos do serviço, catálogo de preços e lembrete de retorno

-- ============ Fotos (antes/depois) ============
create type public.momento_foto as enum ('antes', 'depois');

create table public.orcamento_fotos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  caminho text not null check (char_length(caminho) <= 300),
  url text not null check (char_length(url) <= 600),
  momento public.momento_foto not null default 'antes',
  criado_em timestamptz not null default now()
);
create index orcamento_fotos_orcamento_idx on public.orcamento_fotos (orcamento_id, criado_em);

alter table public.orcamento_fotos enable row level security;
create policy "fotos: dono le" on public.orcamento_fotos for select to authenticated
  using (exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.prestador_id = (select auth.uid())));
create policy "fotos: dono cria" on public.orcamento_fotos for insert to authenticated
  with check (exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.prestador_id = (select auth.uid()))
    and split_part(caminho, '/', 1) = (select auth.uid())::text);
create policy "fotos: dono apaga" on public.orcamento_fotos for delete to authenticated
  using (exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.prestador_id = (select auth.uid())));
revoke all on public.orcamento_fotos from anon;

-- Bucket público com nomes aleatórios (o cliente vê as fotos pelo link); cada um grava só na própria pasta
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']);

create policy "fotos: upload na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: apagar na propria pasta" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ============ Catálogo de preços (aprende com os orçamentos) ============
create table public.catalogo (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null default auth.uid() references public.prestadores(id) on delete cascade,
  tipo public.tipo_item not null default 'servico',
  descricao text not null check (char_length(descricao) between 1 and 300),
  unidade text not null default 'un' check (char_length(unidade) <= 12),
  valor_unitario numeric(12,2) not null default 0 check (valor_unitario >= 0),
  usos integer not null default 1,
  atualizado_em timestamptz not null default now()
);
create unique index catalogo_unico on public.catalogo (prestador_id, tipo, lower(descricao));

alter table public.catalogo enable row level security;
create policy "catalogo: dono le" on public.catalogo for select to authenticated using ((select auth.uid()) = prestador_id);
create policy "catalogo: dono cria" on public.catalogo for insert to authenticated with check ((select auth.uid()) = prestador_id);
create policy "catalogo: dono altera" on public.catalogo for update to authenticated using ((select auth.uid()) = prestador_id) with check ((select auth.uid()) = prestador_id);
create policy "catalogo: dono apaga" on public.catalogo for delete to authenticated using ((select auth.uid()) = prestador_id);
revoke all on public.catalogo from anon;

-- Cada item com valor salvo num orçamento entra/atualiza o catálogo
create or replace function public.aprender_catalogo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prest uuid;
begin
  if new.valor_unitario <= 0 then return null; end if;
  select prestador_id into v_prest from public.orcamentos where id = new.orcamento_id;
  insert into public.catalogo (prestador_id, tipo, descricao, unidade, valor_unitario)
  values (v_prest, new.tipo, new.descricao, new.unidade, new.valor_unitario)
  on conflict (prestador_id, tipo, lower(descricao))
  do update set valor_unitario = excluded.valor_unitario, unidade = excluded.unidade,
                usos = public.catalogo.usos + 1, atualizado_em = now();
  return null;
end;
$$;
revoke execute on function public.aprender_catalogo() from public, anon, authenticated;
create trigger orcamento_itens_aprender after insert on public.orcamento_itens
for each row execute function public.aprender_catalogo();

-- ============ Retorno / manutenção ============
alter table public.orcamentos add column retorno_em date;
create index orcamentos_retorno_idx on public.orcamentos (prestador_id, retorno_em) where retorno_em is not null;

-- Fotos também aparecem para o cliente no link
create or replace function public.fotos_publicas(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('url', f.url, 'momento', f.momento) order by f.momento, f.criado_em), '[]'::jsonb)
  from public.orcamento_fotos f
  join public.orcamentos o on o.id = f.orcamento_id
  where o.token_publico = p_token and o.status <> 'rascunho';
$$;
revoke execute on function public.fotos_publicas(uuid) from public;
grant execute on function public.fotos_publicas(uuid) to anon, authenticated;
