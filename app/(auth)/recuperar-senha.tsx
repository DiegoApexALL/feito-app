import { useState } from 'react';
import { Aviso, Botao, Cabecalho, Campo, Tela } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { emailValido, soDigitos, traduzErroAuth } from '@/lib/validacao';

/**
 * Recuperação em 3 etapas, tudo dentro do app:
 * 1) e-mail → 2) código de 6 dígitos recebido por e-mail → 3) nova senha (tela app/(app)/nova-senha).
 * Requer o template "Reset Password" do Supabase com {{ .Token }} (ver README).
 */
export default function RecuperarSenha() {
  const { setPrecisaNovaSenha } = useAuth();
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviarCodigo() {
    setErro(null);
    if (!emailValido(email)) return setErro('Digite um e-mail válido.');
    setCarregando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setCarregando(false);
    if (error) return setErro(traduzErroAuth(error.message));
    setEtapa(2);
  }

  async function validarCodigo() {
    setErro(null);
    if (codigo.length !== 6) return setErro('O código tem 6 números.');
    setCarregando(true);
    setPrecisaNovaSenha(true); // antes da sessão chegar, para o app abrir direto na tela de nova senha
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: codigo, type: 'recovery' });
    setCarregando(false);
    if (error) {
      setPrecisaNovaSenha(false);
      return setErro('Código inválido ou expirado.');
    }
  }

  if (etapa === 1)
    return (
      <Tela rodape={<Botao titulo="Enviar código" onPress={enviarCodigo} carregando={carregando} />}>
        <Cabecalho titulo="Esqueceu a senha?" subtitulo="Sem problema. Vamos mandar um código para o seu e-mail." />
        {erro ? <Aviso texto={erro} /> : null}
        <Campo
          rotulo="E-mail da conta"
          placeholder="voce@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </Tela>
    );

  return (
      <Tela rodape={<Botao titulo="Continuar" onPress={validarCodigo} carregando={carregando} />}>
        <Cabecalho titulo="Digite o código" subtitulo={`Se ${email.trim()} tiver cadastro, você vai receber 6 números em instantes.`} />
        {erro ? <Aviso texto={erro} /> : null}
        <Campo
          rotulo="Código"
          placeholder="000000"
          value={codigo}
          onChangeText={(t) => setCodigo(soDigitos(t).slice(0, 6))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          style={{ letterSpacing: 8, fontSize: 24, fontWeight: '700' }}
        />
        <Botao titulo="Reenviar código" variante="texto" onPress={enviarCodigo} />
      </Tela>
    );

}
