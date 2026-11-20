import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Prestador, supabase } from '@/lib/supabase';

type AuthValor = {
  sessao: Session | null;
  prestador: Prestador | null;
  carregando: boolean;
  recarregarPerfil: () => Promise<void>;
  sair: () => Promise<void>;
  /** true enquanto o usuário entrou por código de recuperação e ainda não criou a nova senha */
  precisaNovaSenha: boolean;
  setPrecisaNovaSenha: (v: boolean) => void;
};

const AuthContext = createContext<AuthValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [prestador, setPrestador] = useState<Prestador | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [precisaNovaSenha, setPrecisaNovaSenha] = useState(false);

  const buscarPerfil = useCallback(async (uid?: string) => {
    if (!uid) {
      setPrestador(null);
      return;
    }
    const { data } = await supabase.from('prestadores').select('*').eq('id', uid).maybeSingle();
    setPrestador((data as Prestador) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSessao(data.session);
      await buscarPerfil(data.session?.user.id);
      setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
      // fora do callback para não travar o cliente do Supabase
      setTimeout(() => buscarPerfil(nova?.user.id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [buscarPerfil]);

  const valor: AuthValor = {
    sessao,
    prestador,
    carregando,
    recarregarPerfil: () => buscarPerfil(sessao?.user.id),
    sair: async () => {
      setPrecisaNovaSenha(false);
      await supabase.auth.signOut();
    },
    precisaNovaSenha,
    setPrecisaNovaSenha,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
