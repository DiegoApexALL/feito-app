// Feito! · Recebe os avisos do Mercado Pago e libera/renova o plano Pro.
// Segredos: MP_ACCESS_TOKEN (obrigatório) e MP_WEBHOOK_SECRET (assinatura secreta do webhook, recomendado).
// Nunca confiamos no corpo do aviso: sempre consultamos a assinatura direto na API do Mercado Pago.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ok = () => new Response('ok', { status: 200 });

async function hmacHex(segredo: string, texto: string) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(texto));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Confere o cabeçalho x-signature (ts=...,v1=...) conforme a documentação do Mercado Pago. */
async function assinaturaValida(req: Request, idDado: string) {
  const segredo = Deno.env.get('MP_WEBHOOK_SECRET');
  if (!segredo) return true; // sem segredo configurado: segue, pois tudo é reconsultado na API
  const cab = req.headers.get('x-signature') ?? '';
  const partes = Object.fromEntries(cab.split(',').map((p) => p.trim().split('=') as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  const manifesto = `id:${idDado.toLowerCase()};request-id:${req.headers.get('x-request-id') ?? ''};ts:${partes.ts};`;
  return (await hmacHex(segredo, manifesto)) === partes.v1;
}

Deno.serve(async (req) => {
  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) return ok();

  const url = new URL(req.url);
  let corpo: Record<string, any> = {};
  try {
    corpo = await req.json();
  } catch {
    // alguns avisos vêm só na URL
  }
  const tipo: string = corpo.type ?? corpo.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '';
  const id: string = String(corpo?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');
  if (!id) return ok();
  if (!(await assinaturaValida(req, id))) return new Response('assinatura inválida', { status: 401 });

  const mp = (caminho: string) =>
    fetch(`https://api.mercadopago.com${caminho}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null));

  // Descobre a assinatura (preapproval) a partir do tipo de aviso
  let assinatura: any = null;
  if (tipo.includes('preapproval') && !tipo.includes('authorized_payment')) {
    assinatura = await mp(`/preapproval/${id}`);
  } else if (tipo.includes('authorized_payment')) {
    const cobranca = await mp(`/authorized_payments/${id}`);
    if (cobranca?.preapproval_id) assinatura = await mp(`/preapproval/${cobranca.preapproval_id}`);
  }
  if (!assinatura?.external_reference) return ok();

  if (assinatura.status === 'authorized') {
    // Pro vale até a próxima cobrança + 3 dias de folga
    const proxima = assinatura.next_payment_date ? new Date(assinatura.next_payment_date) : new Date(Date.now() + 31 * 86400000);
    const ate = new Date(proxima.getTime() + 3 * 86400000).toISOString();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await admin.rpc('definir_plano_pro', { p_prestador: assinatura.external_reference, p_ate: ate });
    if (error) {
      console.error('Falha ao liberar Pro', error.message);
      return new Response('erro', { status: 500 }); // o Mercado Pago tenta de novo
    }
  }
  // Cancelada/pausada: não faz nada, o Pro termina sozinho na data já paga.
  return ok();
});
