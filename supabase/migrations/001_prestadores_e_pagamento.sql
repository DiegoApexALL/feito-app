-- Feito! · Migração 001 — prestadores, dados de pagamento e logos
-- Já aplicada no projeto Supabase "feito-app" (jlcisnsdbrynxozrfqey, sa-east-1).

-- Tipos
create type public.tipo_documento as enum ('cpf', 'cnpj');
create type public.tipo_chave_pix as enum ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria');

-- Função genérica de updated_at
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- Perfil do prestador (1:1 com auth.users)
create table public.prestadores (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  nome_negocio text check (char_length(nome_negocio) <= 120),
  telefone text check (telefone ~ '^[0-9]{10,13}$'),
  tipo_documento public.tipo_documento,
  documento text check (documento ~ '^[0-9]{11}$|^[0-9]{14}$'),
  especialidades text[] not null default '{}',
  cep text check (cep ~ '^[0-9]{8}$'),
  cidade text,
  uf char(2) check (uf ~ '^[A-Z]{2}$'),
  logo_url text,
  cadastro_completo boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger prestadores_atualizado_em
before update on public.prestadores
for each row execute function public.set_atualizado_em();

-- Dados de recebimento (Pix)
create table public.dados_pagamento (
  prestador_id uuid primary key references public.prestadores(id) on delete cascade,
  pix_tipo public.tipo_chave_pix not null,
  pix_chave text not null check (char_length(pix_chave) between 3 and 140),
  titular_nome text not null check (char_length(titular_nome) between 2 and 120),
  banco text check (char_length(banco) <= 80),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger dados_pagamento_atualizado_em
before update on public.dados_pagamento
for each row execute function public.set_atualizado_em();

-- Cria o perfil automaticamente quando o usuário se cadastra
create or replace function public.criar_perfil_prestador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.prestadores (id, nome, telefone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), split_part(new.email, '@', 1)),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'telefone', ''), '[^0-9]', '', 'g'), '')
  );
  return new;
end;
$$;

revoke execute on function public.criar_perfil_prestador() from public, anon, authenticated;

create trigger ao_criar_usuario
after insert on auth.users
for each row execute function public.criar_perfil_prestador();

-- RLS: cada prestador só enxerga e altera os próprios dados
alter table public.prestadores enable row level security;
alter table public.dados_pagamento enable row level security;

create policy "prestador le o proprio perfil" on public.prestadores
  for select to authenticated using ((select auth.uid()) = id);
create policy "prestador atualiza o proprio perfil" on public.prestadores
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "prestador le seus dados de pagamento" on public.dados_pagamento
  for select to authenticated using ((select auth.uid()) = prestador_id);
create policy "prestador cria seus dados de pagamento" on public.dados_pagamento
  for insert to authenticated with check ((select auth.uid()) = prestador_id);
create policy "prestador atualiza seus dados de pagamento" on public.dados_pagamento
  for update to authenticated using ((select auth.uid()) = prestador_id) with check ((select auth.uid()) = prestador_id);
create policy "prestador apaga seus dados de pagamento" on public.dados_pagamento
  for delete to authenticated using ((select auth.uid()) = prestador_id);

revoke all on public.prestadores, public.dados_pagamento from anon;

-- Bucket de logos: cada usuário só mexe na própria pasta (logos/<uid>/...)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']);

create policy "logo: upload na propria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "logo: atualizar na propria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "logo: apagar na propria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
