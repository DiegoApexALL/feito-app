import type { StatusOrcamento } from './supabase';

const moedaFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const moeda = (v: number | string | null | undefined) => moedaFmt.format(Number(v ?? 0));

export const numeroBR = (v: number) =>
  Number.isInteger(v) ? String(v) : v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });

/** "1.250,50" | "1250.5" → 1250.5 */
export function lerValor(t: string) {
  const s = t.replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(s) || 0;
}

/** Máscara de dinheiro enquanto digita: "1234" → "12,34" */
export function mascaraDinheiro(t: string) {
  const d = t.replace(/\D/g, '').replace(/^0+/, '');
  if (!d) return '';
  const n = Number(d) / 100;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const dinheiroParaTexto = (v: number) =>
  v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

export const dataBR = (iso?: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR') : '';

export function tempoRelativo(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  return dataBR(iso);
}

export const STATUS: Record<StatusOrcamento, { rotulo: string; cor: string; fundo: string }> = {
  rascunho: { rotulo: 'Rascunho', cor: '#4B5160', fundo: '#EEECE8' },
  enviado: { rotulo: 'Enviado', cor: '#1D4ED8', fundo: '#E6EEFD' },
  aprovado: { rotulo: 'Aprovado', cor: '#15803D', fundo: '#E8F7EE' },
  recusado: { rotulo: 'Recusado', cor: '#B91C1C', fundo: '#FDECEC' },
  concluido: { rotulo: 'Concluído', cor: '#7C3AED', fundo: '#F1EAFE' },
  pago: { rotulo: 'Pago', cor: '#0F766E', fundo: '#E2F5F3' },
};

export const linkPublico = (token: string) =>
  `${(process.env.EXPO_PUBLIC_SITE_URL ?? 'https://feito-app.expo.app').replace(/\/$/, '')}/o/${token}`;
