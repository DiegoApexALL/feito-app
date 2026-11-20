import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'qrcode';
import { Linking } from 'react-native';
import { dataBR, linkPublico, moeda, numeroBR } from './formato';
import { gerarPixCopiaECola } from './pix';
import type { DadosPagamento, Orcamento, Prestador } from './supabase';
import { mascaraDocumento, mascaraTelefone, soDigitos } from './validacao';

const esc = (s?: string | null) =>
  (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function pixDoOrcamento(o: Pick<Orcamento, 'numero' | 'total'>, prest: Prestador, pag?: DadosPagamento | null) {
  if (!pag) return null;
  return gerarPixCopiaECola({
    chave: pag.pix_chave,
    nome: pag.titular_nome,
    cidade: prest.cidade ?? 'BRASIL',
    valor: Number(o.total),
    txid: `FEITO${o.numero}`,
  });
}

/** HTML do orçamento em A4, usado para o PDF. */
export async function htmlDoOrcamento(o: Orcamento, prest: Prestador, pag: DadosPagamento | null, marcaDagua: boolean) {
  const itens = o.itens ?? [];
  const servicos = itens.filter((i) => i.tipo === 'servico');
  const materiais = itens.filter((i) => i.tipo === 'material');
  const pix = pixDoOrcamento(o, prest, pag);
  const qr = pix ? await QRCode.toString(pix, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }) : '';
  const validoAte = new Date(new Date(o.enviado_em ?? o.criado_em).getTime() + o.validade_dias * 86400000).toISOString();
  const doc = prest.documento ? `${prest.tipo_documento === 'cnpj' ? 'CNPJ' : 'CPF'} ${mascaraDocumento(prest.documento)}` : '';

  const tabela = (titulo: string, lista: typeof itens) =>
    lista.length
      ? `<h3>${titulo}</h3>
      <table>
        <thead><tr><th>Descrição</th><th class="n">Qtd</th><th class="n">Valor un.</th><th class="n">Total</th></tr></thead>
        <tbody>${lista
          .map(
            (i) => `<tr><td>${esc(i.descricao)}</td><td class="n">${numeroBR(Number(i.quantidade))} ${esc(i.unidade)}</td>
            <td class="n">${moeda(i.valor_unitario)}</td><td class="n">${moeda(Number(i.quantidade) * Number(i.valor_unitario))}</td></tr>`,
          )
          .join('')}</tbody>
      </table>`
      : '';

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, 'Segoe UI', Arial, sans-serif; color: #16181D; font-size: 12pt; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 14px; border-bottom: 3px solid #EA580C; }
  .marca { display: flex; gap: 12px; align-items: center; }
  .marca img { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; }
  .marca h1 { font-size: 18pt; margin: 0; }
  .muted { color: #555B66; font-size: 10.5pt; line-height: 1.5; }
  .num { text-align: right; }
  .num b { font-size: 16pt; display: block; color: #C2410C; }
  .bloco { display: flex; gap: 24px; margin: 18px 0; }
  .bloco > div { flex: 1; background: #F7F5F2; border-radius: 10px; padding: 12px 14px; }
  .rot { font-size: 9pt; text-transform: uppercase; letter-spacing: .06em; color: #555B66; margin-bottom: 4px; }
  h2 { font-size: 15pt; margin: 6px 0 4px; }
  h3 { font-size: 11pt; text-transform: uppercase; letter-spacing: .05em; color: #555B66; margin: 18px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9.5pt; color: #555B66; font-weight: 600; border-bottom: 1px solid #DDD8D1; padding: 6px 4px; }
  td { padding: 8px 4px; border-bottom: 1px solid #EEEAE4; vertical-align: top; }
  .n { text-align: right; white-space: nowrap; }
  .totais { margin-left: auto; width: 55%; margin-top: 14px; }
  .totais div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totais .total { border-top: 2px solid #16181D; margin-top: 6px; padding-top: 8px; font-size: 15pt; font-weight: 800; }
  .pix { display: flex; gap: 16px; align-items: center; margin-top: 22px; padding: 14px; border: 1.5px dashed #EA580C; border-radius: 12px; page-break-inside: avoid; }
  .pix svg { width: 120px; height: 120px; flex-shrink: 0; }
  .cc { font-family: monospace; font-size: 8pt; word-break: break-all; color: #3A3F4A; }
  .cond { margin-top: 18px; font-size: 10.5pt; line-height: 1.6; }
  .assin { display: flex; gap: 40px; margin-top: 44px; }
  .assin div { flex: 1; border-top: 1px solid #16181D; padding-top: 6px; font-size: 10pt; text-align: center; color: #555B66; }
  footer { margin-top: 24px; font-size: 9pt; color: #555B66; text-align: center; }
</style></head><body>
<header>
  <div class="marca">
    ${prest.logo_url ? `<img src="${esc(prest.logo_url)}">` : ''}
    <div>
      <h1>${esc(prest.nome_negocio || prest.nome)}</h1>
      <div class="muted">${[prest.nome_negocio ? esc(prest.nome) : '', esc(doc), prest.telefone ? `WhatsApp ${mascaraTelefone(prest.telefone)}` : '', [prest.cidade, prest.uf].filter(Boolean).map(esc).join(' / ')].filter(Boolean).join('<br>')}</div>
    </div>
  </div>
  <div class="num"><span class="muted">ORÇAMENTO</span><b>Nº ${String(o.numero).padStart(4, '0')}</b><span class="muted">Emitido em ${dataBR(o.criado_em)}<br>Válido até ${dataBR(validoAte)}</span></div>
</header>

<div class="bloco">
  <div><div class="rot">Cliente</div><b>${esc(o.cliente?.nome || 'Cliente')}</b>${o.cliente?.telefone ? `<div class="muted">${mascaraTelefone(o.cliente.telefone)}</div>` : ''}${o.cliente?.endereco ? `<div class="muted">${esc(o.cliente.endereco)}</div>` : ''}</div>
  ${o.prazo_execucao ? `<div><div class="rot">Prazo de execução</div><b>${esc(o.prazo_execucao)}</b></div>` : ''}
</div>

<h2>${esc(o.titulo)}</h2>
${o.descricao ? `<p class="muted">${esc(o.descricao).replace(/\n/g, '<br>')}</p>` : ''}

${tabela('Serviços', servicos)}
${tabela('Materiais', materiais)}

<div class="totais">
  <div><span>Subtotal</span><span>${moeda(o.subtotal)}</span></div>
  ${Number(o.desconto) > 0 ? `<div><span>Desconto</span><span>− ${moeda(o.desconto)}</span></div>` : ''}
  <div class="total"><span>Total</span><span>${moeda(o.total)}</span></div>
</div>

${
  pix
    ? `<div class="pix">${qr}<div><b>Pague com Pix</b><div class="muted">Aponte a câmera do app do banco para o QR Code ou use o Pix Copia e Cola. Recebedor: ${esc(pag!.titular_nome)}</div><div class="cc">${esc(pix)}</div></div></div>`
    : ''
}

<div class="cond">
  ${o.forma_pagamento ? `<div><b>Forma de pagamento:</b> ${esc(o.forma_pagamento)}</div>` : ''}
  ${o.observacoes ? `<div><b>Observações:</b> ${esc(o.observacoes).replace(/\n/g, '<br>')}</div>` : ''}
  ${o.respondido_por && o.status !== 'recusado' && o.respondido_em ? `<div><b>Aprovado por</b> ${esc(o.respondido_por)} em ${dataBR(o.respondido_em)} pelo link.</div>` : ''}
</div>

<div class="assin"><div>${esc(prest.nome)}</div><div>${esc(o.cliente?.nome || 'Cliente')}</div></div>
${marcaDagua ? '<footer>Orçamento feito com o app Feito! · orçamentos profissionais em 1 minuto</footer>' : ''}
</body></html>`;
}

export async function compartilharPdf(o: Orcamento, prest: Prestador, pag: DadosPagamento | null, marcaDagua: boolean) {
  const html = await htmlDoOrcamento(o, prest, pag, marcaDagua);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Orçamento ${o.numero} - ${o.cliente?.nome ?? ''}`,
    });
  } else {
    await Print.printAsync({ html });
  }
}

export function mensagemWhatsApp(o: Orcamento, prest: Prestador) {
  const primeiro = o.cliente?.nome?.split(' ')[0];
  return [
    `Olá${primeiro ? `, ${primeiro}` : ''}! Aqui é ${prest.nome}${prest.nome_negocio ? `, da ${prest.nome_negocio}` : ''}.`,
    '',
    `Segue o orçamento *${o.titulo}*:`,
    `💰 Total: *${moeda(o.total)}*`,
    o.prazo_execucao ? `⏱️ Prazo: ${o.prazo_execucao}` : '',
    '',
    `Veja os detalhes, pague com Pix e aprove por aqui 👇`,
    linkPublico(o.token_publico),
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
}

export async function abrirWhatsApp(texto: string, telefone?: string | null) {
  const d = soDigitos(telefone ?? '');
  const numero = d ? (d.length <= 11 ? `55${d}` : d) : '';
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  await Linking.openURL(url);
}
