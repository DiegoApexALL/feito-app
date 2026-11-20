import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Aviso, Botao, Cabecalho, Campo, ForcaDaSenha, Tela } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { emailValido, mascaraTelefone, senhaAceita, soDigitos, telefoneValido, traduzErroAuth } from '@/lib/validacao';
import { cores, espaco, fonte } from '@/theme';

type Erros = Partial<Record<'nome' | 'telefone' | 'email' | 'senha' | 'confirmar' | 'geral', string>>;

export default function CriarConta() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [carregando, setCarregando] = useState(false);
  const [confirmeEmail, setConfirmeEmail] = useState(false);

  const telRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const senhaRef = useRef<TextInput>(null);
  const confRef = useRef<TextInput>(null);

  function validar(): Erros {
    const e: Erros = {};
    if (nome.trim().length < 2) e.nome = 'Como podemos te chamar?';
    if (!telefoneValido(telefone)) e.telefone = 'WhatsApp com DDD, ex.: (11) 98765-4321';
    if (!emailValido(email)) e.email = 'E-mail inválido.';
    if (!senhaAceita(senha)) e.senha = 'Use 8+ caracteres com letras e números.';
    if (confirmar !== senha) e.confirmar = 'As senhas não são iguais.';
    return e;
  }

  async function criar() {
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) return;
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: senha,
      options: { data: { nome: nome.trim(), telefone: soDigitos(telefone) } },
    });
    setCarregando(false);
    if (error) return setErros({ geral: traduzErroAuth(error.message) });
    // Se a confirmação por e-mail estiver ligada, não vem sessão ainda
    if (!data.session) setConfirmeEmail(true);
  }

  if (confirmeEmail) {
    return (
      <Tela rodape={<Botao titulo="Ir para o login" onPress={() => router.replace('/entrar')} />}>
        <Text style={{ fontSize: 56, marginBottom: espaco.m }}>📬</Text>
        <Cabecalho
          titulo="Confira seu e-mail"
          subtitulo={`Enviamos um link de confirmação para ${email.trim()}. Toque nele e depois entre com sua senha.`}
        />
      </Tela>
    );
  }

  return (
    <Tela rodape={<Botao titulo="Criar conta" onPress={criar} carregando={carregando} />}>
      <Cabecalho titulo="Crie sua conta" subtitulo="É grátis e leva menos de 1 minuto." />
      {erros.geral ? <Aviso texto={erros.geral} /> : null}
      <Campo
        rotulo="Seu nome"
        placeholder="Ex.: João da Silva"
        value={nome}
        onChangeText={setNome}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        erro={erros.nome}
        returnKeyType="next"
        onSubmitEditing={() => telRef.current?.focus()}
      />
      <Campo
        ref={telRef}
        rotulo="WhatsApp"
        placeholder="(11) 98765-4321"
        value={telefone}
        onChangeText={(t) => setTelefone(mascaraTelefone(t))}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        erro={erros.telefone}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <Campo
        ref={emailRef}
        rotulo="E-mail"
        placeholder="voce@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        erro={erros.email}
        returnKeyType="next"
        onSubmitEditing={() => senhaRef.current?.focus()}
      />
      <Campo
        ref={senhaRef}
        rotulo="Senha"
        placeholder="Crie uma senha"
        value={senha}
        onChangeText={setSenha}
        senha
        autoComplete="new-password"
        textContentType="newPassword"
        erro={erros.senha}
        returnKeyType="next"
        onSubmitEditing={() => confRef.current?.focus()}
      />
      <ForcaDaSenha senha={senha} />
      <Campo
        ref={confRef}
        rotulo="Confirme a senha"
        placeholder="Digite de novo"
        value={confirmar}
        onChangeText={setConfirmar}
        senha
        autoComplete="new-password"
        textContentType="newPassword"
        erro={erros.confirmar}
        returnKeyType="go"
        onSubmitEditing={criar}
      />
      <Text style={[fonte.pequeno, { marginTop: espaco.s }]}>
        Ao criar a conta você concorda com os Termos de Uso e a Política de Privacidade (LGPD).
      </Text>
      <View style={{ flexDirection: 'row', marginTop: espaco.l, gap: 4 }}>
        <Text style={fonte.corpo}>Já tem conta?</Text>
        <Link href="/entrar" replace style={{ color: cores.primariaEscura, fontWeight: '700', fontSize: 16 }}>
          Entrar
        </Link>
      </View>
    </Tela>
  );
}
