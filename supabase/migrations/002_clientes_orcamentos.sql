-- Feito! · Migração 002 — clientes, orçamentos, itens, aprovação pelo link e plano

-- ============ Plano do prestador ============
create type public.plano as enum ('gratis', 'pro');
alter table public.prestadores
  add column plano public.plano not null default 'gratis',
  add column plano_ate timestamptz;

-- O prestador NÃO pode mudar o próprio plano pelo app (só o backend de pagamento, com service_role)
revoke update on public.prestadores from authenticated;
grant update (nome, nome_negocio, telefone, tipo_documento, documento, especialidades, cep, cidade, uf, logo_url, cadastro_completo)
  on public.prestadores to authenticated;

create or replace function public.plano_ativo(p public.prestadores)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p.plano = 'pro' and (p.plano_ate is null or p.plano_ate > now());
$$;

-- ============ Clientes ============
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null default auth.uid() references public.prestadores(id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text check (telefone ~ '^[0-9]{10,13}$'),
  email text check (char_length(email) <= 160),
  endereco text check (char_length(endereco) <= 300),
  observacoes text check (char_length(observacoes) <= 1000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index clientes_prestador_idx on public.clientes (prestador_id, nome);

create trigger clientes_atualizado_em before update on public.clientes
for each row execute function public.set_atualizado_em();

alter table public.clientes enable row level security;
create policy "clientes: dono le" on public.clientes for select to authenticated using ((select auth.uid()) = prestador_id);
create policy "clientes: dono cria" on public.clientes for insert to authenticated with check ((select auth.uid()) = prestador_id);
create policy "clientes: dono altera" on public.clientes for update to authenticated using ((select auth.uid()) = prestador_id) with check ((select auth.uid()) = prestador_id);
create policy "clientes: dono apaga" on public.clientes for delete to authenticated using ((select auth.uid()) = prestador_id);

-- ============ Orçamentos ============
create type public.status_orcamento as enum ('rascunho', 'enviado', 'aprovado', 'recusado', 'concluido', 'pago');
create type public.tipo_item as enum ('servico', 'material');

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null default auth.uid() references public.prestadores(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  numero integer not null default 0,
  titulo text not null check (char_length(titulo) between 2 and 140),
  descricao text check (char_length(descricao) <= 4000),
  status public.status_orcamento not null default 'rascunho',
  desconto numeric(12,2) not null default 0 check (desconto >= 0),
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  validade_dias integer not null default 15 check (validade_dias between 1 and 365),
  prazo_execucao text check (char_length(prazo_execucao) <= 120),
  forma_pagamento text check (char_length(forma_pagamento) <= 200),
  observacoes text check (char_length(observacoes) <= 2000),
  token_publico uuid not null default gen_random_uuid() unique,
  enviado_em timestamptz,
  visualizado_em timestamptz,
  respondido_em timestamptz,
  respondido_por text check (char_length(respondido_por) <= 120),
  motivo_recusa text check (char_length(motivo_recusa) <= 500),
  concluido_em timestamptz,
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (prestador_id, numero)
);
create index orcamentos_prestador_idx on public.orcamentos (prestador_id, criado_em desc);
create index orcamentos_cliente_idx on public.orcamentos (cliente_id);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  tipo public.tipo_item not null default 'servico',
  descricao text not null check (char_length(descricao) between 1 and 300),
  quantidade numeric(12,3) not null default 1 check (quantidade > 0),
  unidade text not null default 'un' check (char_length(unidade) <= 12),
  valor_unitario numeric(12,2) not null default 0 check (valor_unitario >= 0),
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);
create index orcamento_itens_orcamento_idx on public.orcamento_itens (orcamento_id, ordem);

-- Número sequencial por prestador + limite do plano grátis (5 por mês)
create or replace function public.antes_de_criar_orcamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prest public.prestadores;
  v_no_mes integer;
begin
  select * into v_prest from public.prestadores where id = new.prestador_id for update;
  if not public.plano_ativo(v_prest) then
    select count(*) into v_no_mes from public.orcamentos
      where prestador_id = new.prestador_id and criado_em >= date_trunc('month', now());
    if v_no_mes >= 5 then
      raise exception 'LIMITE_PLANO_GRATIS' using hint = 'O plano grátis permite 5 orçamentos por mês.';
    end if;
  end if;
  select coalesce(max(numero), 0) + 1 into new.numero from public.orcamentos where prestador_id = new.prestador_id;
  -- campos controlados pelo sistema
  new.subtotal := 0;
  new.total := 0;
  new.respondido_em := null; new.respondido_por := null; new.visualizado_em := null;
  if new.status in ('aprovado', 'recusado') then new.status := 'rascunho'; end if;
  return new;
end;
$$;
revoke execute on function public.antes_de_criar_orcamento() from public, anon, authenticated;
create trigger orcamentos_antes_insert before insert on public.orcamentos
for each row execute function public.antes_de_criar_orcamento();

-- Protege campos do sistema nas alterações feitas pelo app
create or replace function public.antes_de_alterar_orcamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.numero := old.numero;
  new.token_publico := old.token_publico;
  new.prestador_id := old.prestador_id;
  -- quem aprova/recusa é o cliente, pela função pública
  if current_setting('feito.cliente', true) is distinct from 'sim' then
    new.respondido_em := old.respondido_em;
    new.respondido_por := old.respondido_por;
    new.motivo_recusa := old.motivo_recusa;
    new.visualizado_em := old.visualizado_em;
    if new.status in ('aprovado', 'recusado') and new.status is distinct from old.status then
      raise exception 'Somente o cliente pode aprovar ou recusar pelo link.';
    end if;
  end if;
  -- subtotal só muda pelo recálculo dos itens
  if current_setting('feito.sistema', true) is distinct from 'sim' then
    new.subtotal := old.subtotal;
  end if;
  if new.status = 'enviado' and old.enviado_em is null then new.enviado_em := now(); end if;
  if new.status = 'concluido' and old.concluido_em is null then new.concluido_em := now(); end if;
  if new.status = 'pago' and old.pago_em is null then new.pago_em := now(); end if;
  -- total sempre coerente com o desconto
  new.total := greatest(new.subtotal - new.desconto, 0);
  return new;
end;
$$;
create trigger orcamentos_antes_update before update on public.orcamentos
for each row execute function public.antes_de_alterar_orcamento();

-- Recalcula subtotal/total quando os itens mudam
create or replace function public.recalcular_orcamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce(new.orcamento_id, old.orcamento_id);
begin
  perform set_config('feito.sistema', 'sim', true);
  update public.orcamentos o
     set subtotal = coalesce((select sum(round(i.quantidade * i.valor_unitario, 2)) from public.orcamento_itens i where i.orcamento_id = v_id), 0)
   where o.id = v_id;
  perform set_config('feito.sistema', '', true);
  return null;
end;
$$;
revoke execute on function public.recalcular_orcamento() from public, anon, authenticated;
create trigger orcamento_itens_recalcular after insert or update or delete on public.orcamento_itens
for each row execute function public.recalcular_orcamento();

alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;

create policy "orcamentos: dono le" on public.orcamentos for select to authenticated using ((select auth.uid()) = prestador_id);
create policy "orcamentos: dono cria" on public.orcamentos for insert to authenticated
  with check ((select auth.uid()) = prestador_id
    and (cliente_id is null or exists (select 1 from public.clientes c where c.id = cliente_id and c.prestador_id = (select auth.uid()))));
create policy "orcamentos: dono altera" on public.orcamentos for update to authenticated
  using ((select auth.uid()) = prestador_id)
  with check ((select auth.uid()) = prestador_id
    and (cliente_id is null or exists (select 1 from public.clientes c where c.id = cliente_id and c.prestador_id = (select auth.uid()))));
create policy "orcamentos: dono apaga" on public.orcamentos for delete to authenticated using ((select auth.uid()) = prestador_id);

create policy "itens: dono le" on public.orcamento_itens for select to authenticated
  using (exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.prestador_id = (select auth.uid())));
create policy "itens: dono cria" on public.orcamento_itens for insert to authenticated
  with check (exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.prestador_id = (select auth.uid())));
create policy "itens: dono altera" on public.orcamento_itens for update to authenticated
  using (exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.prestador_id = (select auth.uid())))
  with check (exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.prestador_id = (select auth.uid())));
create policy "itens: dono apaga" on public.orcamento_itens for delete to authenticated
  using (exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.prestador_id = (select auth.uid())));

revoke all on public.clientes, public.orcamentos, public.orcamento_itens from anon;

-- ============ Link público do cliente ============
-- O cliente não tem login: acessa só pelo token (UUID aleatório, impossível de adivinhar).
create or replace function public.orcamento_publico(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_o public.orcamentos;
  v_r jsonb;
begin
  select * into v_o from public.orcamentos where token_publico = p_token and status <> 'rascunho';
  if not found then return null; end if;

  if v_o.visualizado_em is null then
    perform set_config('feito.cliente', 'sim', true);
    update public.orcamentos set visualizado_em = now() where id = v_o.id;
    perform set_config('feito.cliente', '', true);
  end if;

  select jsonb_build_object(
    'numero', v_o.numero,
    'titulo', v_o.titulo,
    'descricao', v_o.descricao,
    'status', v_o.status,
    'subtotal', v_o.subtotal,
    'desconto', v_o.desconto,
    'total', v_o.total,
    'validade_dias', v_o.validade_dias,
    'valido_ate', (coalesce(v_o.enviado_em, v_o.criado_em) + make_interval(days => v_o.validade_dias))::date,
    'prazo_execucao', v_o.prazo_execucao,
    'forma_pagamento', v_o.forma_pagamento,
    'observacoes', v_o.observacoes,
    'criado_em', v_o.criado_em,
    'respondido_em', v_o.respondido_em,
    'respondido_por', v_o.respondido_por,
    'cliente', (select jsonb_build_object('nome', c.nome) from public.clientes c where c.id = v_o.cliente_id),
    'prestador', (select jsonb_build_object(
        'nome', p.nome, 'nome_negocio', p.nome_negocio, 'telefone', p.telefone,
        'documento', p.documento, 'tipo_documento', p.tipo_documento,
        'cidade', p.cidade, 'uf', p.uf, 'logo_url', p.logo_url,
        'marca_dagua', not public.plano_ativo(p))
      from public.prestadores p where p.id = v_o.prestador_id),
    'pix', (select jsonb_build_object('tipo', d.pix_tipo, 'chave', d.pix_chave, 'titular', d.titular_nome)
      from public.dados_pagamento d where d.prestador_id = v_o.prestador_id),
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
        'tipo', i.tipo, 'descricao', i.descricao, 'quantidade', i.quantidade,
        'unidade', i.unidade, 'valor_unitario', i.valor_unitario) order by i.ordem, i.criado_em)
      from public.orcamento_itens i where i.orcamento_id = v_o.id), '[]'::jsonb)
  ) into v_r;
  return v_r;
end;
$$;

create or replace function public.responder_orcamento(p_token uuid, p_aprovar boolean, p_nome text, p_motivo text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_o public.orcamentos;
  v_nome text := left(trim(coalesce(p_nome, '')), 120);
begin
  if char_length(v_nome) < 2 then raise exception 'Informe seu nome.'; end if;
  select * into v_o from public.orcamentos where token_publico = p_token for update;
  if not found then raise exception 'Orçamento não encontrado.'; end if;
  if v_o.status <> 'enviado' then raise exception 'Este orçamento já foi respondido.'; end if;
  if now() > coalesce(v_o.enviado_em, v_o.criado_em) + make_interval(days => v_o.validade_dias) then
    raise exception 'Este orçamento venceu. Peça um novo ao prestador.';
  end if;

  perform set_config('feito.cliente', 'sim', true);
  update public.orcamentos
     set status = case when p_aprovar then 'aprovado'::public.status_orcamento else 'recusado'::public.status_orcamento end,
         respondido_em = now(),
         respondido_por = v_nome,
         motivo_recusa = case when p_aprovar then null else left(p_motivo, 500) end
   where id = v_o.id;
  perform set_config('feito.cliente', '', true);
  return jsonb_build_object('ok', true, 'status', case when p_aprovar then 'aprovado' else 'recusado' end);
end;
$$;

revoke execute on function public.orcamento_publico(uuid) from public;
revoke execute on function public.responder_orcamento(uuid, boolean, text, text) from public;
grant execute on function public.orcamento_publico(uuid) to anon, authenticated;
grant execute on function public.responder_orcamento(uuid, boolean, text, text) to anon, authenticated;

-- ============ Resumo do mês para a tela inicial ============
create or replace function public.resumo_mes()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'orcamentos', count(*),
    'aprovados', count(*) filter (where status in ('aprovado', 'concluido', 'pago')),
    'faturado', coalesce(sum(total) filter (where status in ('aprovado', 'concluido', 'pago')), 0),
    'recebido', coalesce(sum(total) filter (where status = 'pago'), 0)
  )
  from public.orcamentos
  where prestador_id = (select auth.uid()) and criado_em >= date_trunc('month', now());
$$;
revoke execute on function public.resumo_mes() from public, anon;
grant execute on function public.resumo_mes() to authenticated;
