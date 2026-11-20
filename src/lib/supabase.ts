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
};

export type TipoChavePix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

export type DadosPagamento = {
  prestador_id: string;
  pix_tipo: TipoChavePix;
  pix_chave: string;
  titular_nome: string;
  banco: string | null;
};
