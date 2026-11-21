// Feito! · Cria a assinatura do plano Pro no Mercado Pago e devolve o link de pagamento.
// Segredos (Supabase › Edge Functions › Secrets): MP_ACCESS_TOKEN
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PRECO_PRO = 19.9;
const SITE = Deno.env.get('SITE_URL') ?? 'https://diegoapexall.github.io/feito-app';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);

  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return json({ erro: 'pagamento_nao_configurado' }, 503);

  // Quem está assinando (pelo login do app)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return json({ erro: 'nao_autenticado' }, 401);

  let emailPagador = u.user.email ?? '';
  try {
    const corpo = await req.json();
    if (typeof corpo?.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(corpo.email.trim())) {
      emailPagador = corpo.email.trim().toLowerCase();
    }
  } catch {
    // sem corpo: usa o e-mail do login
  }

  const r = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reason: 'Feito! Pro · orçamentos ilimitados',
      external_reference: u.user.id,
      payer_email: emailPagador,
      back_url: `${SITE}/`,
      status: 'pending',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: PRECO_PRO, currency_id: 'BRL' },
    }),
  });
  const mp = await r.json();
  if (!r.ok || !mp.init_point) {
    console.error('Mercado Pago recusou', r.status, JSON.stringify(mp));
    return json({ erro: 'mercado_pago', detalhe: mp?.message ?? null }, 502);
  }
  return json({ url: mp.init_point, id: mp.id });
});
