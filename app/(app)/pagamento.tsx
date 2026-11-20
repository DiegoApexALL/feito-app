import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Aviso, Botao, Cabecalho, Campo, Chip, Passos, Tela } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { DadosPagamento, supabase, TipoChavePix } from '@/lib/supabase';
import { cnpjValido, cpfValido, emailValido, mascaraDocumento, mascaraTelefone, soDigitos, telefoneValido } from '@/lib/validacao';
import { espaco, fonte } from '@/theme';

const TIPOS: { valor: TipoChavePix; rotulo: string; exemplo: string }[] = [
  { valor: 'telefone', rotulo: 'Celular', exemplo: '(11) 98765-4321' },
  { valor: 'cpf', rotulo: 'CPF', exemplo: '000.000.000-00' },
  { valor: 'cnpj', rotulo: 'CNPJ', exemplo: '00.000.000/0000-00' },
  { valor: 'email', rotulo: 'E-mail', exemplo: 'voce@email.com' },
  { valor: 'aleatoria', rotulo: 'Aleatória', exemplo: 'Cole sua chave aleatória' },
];

function mascarar(tipo: TipoChavePix, v: string) {
  if (tipo === 'telefone') return mascaraTelefone(v);
  if (tipo === 'cpf') return mascaraDocumento(soDigitos(v).slice(0, 11));
  if (tipo === 'cnpj') return mascaraDocumento(v);
  return v.trim();
}

function chaveValida(tipo: TipoChavePix, v: string) {
  if (tipo === 'telefone') return telefoneValido(v);
  if (tipo === 'cpf') return cpfValido(v);
  if (tipo === 'cnpj') return cnpjValido(v);
  if (tipo === 'email') return emailValido(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());
}

/** Guarda a chave no formato que o Pix espera (telefone com +55, documentos só dígitos). */
function normalizar(tipo: TipoChavePix, v: string) {
  if (tipo === 'telefone') return `+55${soDigitos(v)}`;
  if (tipo === 'cpf' || tipo === 'cnpj') return soDigitos(v);
  if (tipo === 'email') return v.trim().toLowerCase();
  return v.trim().toLowerCase();
}

function paraExibir(tipo: TipoChavePix, v: string) {
  if (tipo === 'telefone') return mascaraTelefone(v.replace(/^\+55/, ''));
  return mascarar(tipo, v);
}

export default function Pagamento() {
  const { sessao, prestador, recarregarPerfil } = useAuth();
  const onboarding = !prestador?.cadastro_completo;

  const [tipo, setTipo] = useState<TipoChavePix>('telefone');
  const [chave, setChave] = useState('');
  const [titular, setTitular] = useState(prestador?.nome ?? '');
  const [banco, setBanco] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!sessao) return;
    supabase
      .from('dados_pagamento')
      .select('*')
      .eq('prestador_id', sessao.user.id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as DadosPagamento | null;
        if (!d) return;
        setTipo(d.pix_tipo);
        setChave(paraExibir(d.pix_tipo, d.pix_chave));
        setTitular(d.titular_nome);
        setBanco(d.banco ?? '');
      });
  }, [sessao]);

  async function concluirCadastro() {
    if (!sessao) return;
    await supabase.from('prestadores').update({ cadastro_completo: true }).eq('id', sessao.user.id);
    await recarregarPerfil(); // o layout libera a tela inicial
    router.replace('/');
  }

  async function salvar() {
    setErro(null);
    if (!chaveValida(tipo, chave)) return setErro('Confira a chave Pix.');
    if (titular.trim().length < 2) return setErro('Informe o nome do titular da conta.');
    if (!sessao) return;
    setSalvando(true);
    const { error } = await supabase.from('dados_pagamento').upsert({
      prestador_id: sessao.user.id,
      pix_tipo: tipo,
      pix_chave: normalizar(tipo, chave),
      titular_nome: titular.trim(),
      banco: banco.trim() || null,
    });
    if (error) {
      setSalvando(false);
      return setErro('Não foi possível salvar. Tente de novo.');
    }
    if (onboarding) await concluirCadastro();
    else router.back();
    setSalvando(false);
  }

  const atual = TIPOS.find((t) => t.valor === tipo)!;

  return (
    <Tela
      rodape={
        <>
          <Botao titulo={onboarding ? 'Concluir cadastro' : 'Salvar'} onPress={salvar} carregando={salvando} />
          {onboarding ? <Botao titulo="Configurar depois" variante="texto" onPress={concluirCadastro} /> : null}
        </>
      }
    >
      {onboarding ? <Passos atual={2} total={2} /> : null}
      <Cabecalho
        titulo="Como você quer receber?"
        subtitulo="Sua chave Pix vai no orçamento, com QR Code. O cliente paga na hora."
      />
      {erro ? <Aviso texto={erro} /> : null}

      <Text style={[fonte.rotulo, { marginBottom: espaco.s }]}>Tipo de chave Pix</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s, marginBottom: espaco.l }}>
        {TIPOS.map((t) => (
          <Chip
            key={t.valor}
            rotulo={t.rotulo}
            ativo={tipo === t.valor}
            onPress={() => {
              setTipo(t.valor);
              setChave('');
            }}
          />
        ))}
      </View>

      <Campo
        rotulo="Chave Pix"
        placeholder={atual.exemplo}
        value={chave}
        onChangeText={(v) => setChave(mascarar(tipo, v))}
        keyboardType={tipo === 'email' ? 'email-address' : tipo === 'aleatoria' ? 'default' : 'number-pad'}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Campo rotulo="Nome do titular" value={titular} onChangeText={setTitular} autoCapitalize="words" />
      <Campo rotulo="Banco (opcional)" placeholder="Ex.: Nubank, Caixa, Inter" value={banco} onChangeText={setBanco} />

      <Text style={[fonte.pequeno, { marginTop: espaco.s }]}>
        🔒 Seus dados ficam protegidos: só você tem acesso a eles. Nunca pedimos sua senha do banco.
      </Text>
    </Tela>
  );
}
