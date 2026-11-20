import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { secureStorage } from './secureStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY no arquivo .env');
}

export const supabase = createClient(url, key, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Só renova o token com o app aberto (economiza bateria e evita sessões presas)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export type Prestador = {
  id: string;
  nome: string;
  nome_negocio: string | null;
  telefone: string | null;
  tipo_documento: 'cpf' | 'cnpj' | null;
  documento: string | null;
  especialidades: string[];
  cep: string | null;
  cidade: string | null;
  uf: string | null;
  logo_url: string | null;
  cadastro_completo: boolean;
  plano: 'gratis' | 'pro';
  plano_ate: string | null;
};

export const planoAtivo = (p?: Prestador | null) =>
  !!p && p.plano === 'pro' && (!p.plano_ate || new Date(p.plano_ate) > new Date());

export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  observacoes: string | null;
  criado_em: string;
};

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'concluido' | 'pago';

export type ItemOrcamento = {
  id?: string;
  tipo: 'servico' | 'material';
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  ordem?: number;
};

export type Orcamento = {
  id: string;
  cliente_id: string | null;
  numero: number;
  titulo: string;
  descricao: string | null;
  status: StatusOrcamento;
  desconto: number;
  subtotal: number;
  total: number;
  validade_dias: number;
  prazo_execucao: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  token_publico: string;
  enviado_em: string | null;
  visualizado_em: string | null;
  respondido_em: string | null;
  respondido_por: string | null;
  motivo_recusa: string | null;
  criado_em: string;
  retorno_em: string | null;
  cliente?: Pick<Cliente, 'id' | 'nome' | 'telefone' | 'endereco'> | null;
  itens?: ItemOrcamento[];
  fotos?: Foto[];
};

export type Foto = { id: string; orcamento_id: string; caminho: string; url: string; momento: 'antes' | 'depois'; criado_em: string };

export type ItemCatalogo = {
  id: string;
  tipo: 'servico' | 'material';
  descricao: string;
  unidade: string;
  valor_unitario: number;
  usos: number;
};

/** Formato devolvido pela função pública orcamento_publico(token). */
export type OrcamentoPublico = {
  numero: number;
  titulo: string;
  descricao: string | null;
  status: StatusOrcamento;
  subtotal: number;
  desconto: number;
  total: number;
  validade_dias: number;
  valido_ate: string;
  prazo_execucao: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  criado_em: string;
  respondido_em: string | null;
  respondido_por: string | null;
  cliente: { nome: string } | null;
  prestador: {
    nome: string;
    nome_negocio: string | null;
    telefone: string | null;
    documento: string | null;
    tipo_documento: 'cpf' | 'cnpj' | null;
    cidade: string | null;
    uf: string | null;
    logo_url: string | null;
    marca_dagua: boolean;
  };
  pix: { tipo: TipoChavePix; chave: string; titular: string } | null;
  itens: ItemOrcamento[];
};

export type TipoChavePix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

export type DadosPagamento = {
  prestador_id: string;
  pix_tipo: TipoChavePix;
  pix_chave: string;
  titular_nome: string;
  banco: string | null;
};
