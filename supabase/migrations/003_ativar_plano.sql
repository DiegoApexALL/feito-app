-- Feito! · Migração 003 — liberar/renovar o plano Pro
-- Chamada SOMENTE pelo backend de pagamento (webhook) com a chave service_role.
create or replace function public.ativar_plano_pro(p_prestador uuid, p_dias integer default 31)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.prestadores
     set plano = 'pro',
         plano_ate = greatest(coalesce(plano_ate, now()), now()) + make_interval(days => p_dias)
   where id = p_prestador;
end;
$$;
revoke execute on function public.ativar_plano_pro(uuid, integer) from public, anon, authenticated;
grant execute on function public.ativar_plano_pro(uuid, integer) to service_role;
