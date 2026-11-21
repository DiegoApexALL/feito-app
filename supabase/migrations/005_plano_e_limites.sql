-- Feito! · Migração 005 — Pro pela data paga (idempotente) e logo até 5 MB

-- Define o Pro até uma data (nunca encurta). Usado pelo webhook do Mercado Pago.
create or replace function public.definir_plano_pro(p_prestador uuid, p_ate timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.prestadores
     set plano = 'pro',
         plano_ate = greatest(coalesce(plano_ate, now()), p_ate)
   where id = p_prestador;
end;
$$;
revoke execute on function public.definir_plano_pro(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.definir_plano_pro(uuid, timestamptz) to service_role;

-- O app já reduz a imagem, mas damos folga
update storage.buckets set file_size_limit = 5242880 where id = 'logos';
