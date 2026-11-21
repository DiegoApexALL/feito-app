import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Aviso, Botao, Cabecalho, Campo, Tela } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { emailValido, sugerirEmail, traduzErroAuth } from '@/lib/validacao';
import { cores, espaco, fonte } from '@/theme';

export default function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [naoConfirmado, setNaoConfirmado] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const senhaRef = useRef<TextInput>(null);

  async function entrar() {
    setErro(null);
    if (!emailValido(email)) return setErro('Digite um e-mail válido.');
    if (!senha) return setErro('Digite sua senha.');
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
    setCarregando(false);
    // Sucesso: o layout raiz troca para o app sozinho
    if (!error) return;
    const pendente = error.message.toLowerCase().includes('not confirmed');
    setNaoConfirmado(pendente);
    setReenviado(false);
    const sugestao = sugerirEmail(email);
    setErro(
      sugestao && !pendente
        ? `E-mail ou senha incorretos. Será que o e-mail não é ${sugestao}?`
        : traduzErroAuth(error.message),
    );
  }

  async function reenviar() {
    await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
    setReenviado(true);
  }

  return (
    <Tela rodape={<Botao titulo="Entrar" onPress={entrar} carregando={carregando} />}>
      <Cabecalho titulo="Bem-vindo de volta 👋" subtitulo="Entre para ver seus orçamentos e clientes." />
      {erro ? <Aviso texto={erro} /> : null}
      {naoConfirmado ? (
        <Botao
          titulo={reenviado ? 'E-mail reenviado ✓ (veja o Spam também)' : 'Reenviar e-mail de confirmação'}
          variante="secundario"
          desabilitado={reenviado}
          onPress={reenviar}
          estilo={{ marginBottom: espaco.m }}
        />
      ) : null}
      <Campo
        rotulo="E-mail"
        placeholder="voce@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => senhaRef.current?.focus()}
      />
      <Campo
        ref={senhaRef}
        rotulo="Senha"
        placeholder="Sua senha"
        value={senha}
        onChangeText={setSenha}
        senha
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={entrar}
      />
      <Link href="/recuperar-senha" style={{ color: cores.primariaEscura, fontWeight: '600', fontSize: 15 }}>
        Esqueci minha senha
      </Link>
      <View style={{ flexDirection: 'row', marginTop: espaco.xl, gap: 4 }}>
        <Text style={fonte.corpo}>Ainda não tem conta?</Text>
        <Link href="/criar-conta" replace style={{ color: cores.primariaEscura, fontWeight: '700', fontSize: 16 }}>
          Criar agora
        </Link>
      </View>
    </Tela>
  );
}
