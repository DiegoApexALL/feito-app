import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { CartaoOrcamento } from '@/components/CartaoOrcamento';
import { Aviso, Botao, Cabecalho, Campo, Secao, Tela } from '@/components/ui';
import { abrirWhatsApp } from '@/lib/documento';
import { moeda } from '@/lib/formato';
import { Cliente, Orcamento, supabase } from '@/lib/supabase';
import { emailValido, mascaraTelefone, soDigitos, telefoneValido } from '@/lib/validacao';
import { cores, espaco, fonte } from '@/theme';

export default function ClienteTela() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const novo = id === 'novo';

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [obs, setObs] = useState('');
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (novo) return;
    (async () => {
      const [c, o] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', id).maybeSingle(),
        supabase.from('orcamentos').select('*, cliente:clientes(id, nome, telefone, endereco)').eq('cliente_id', id).order('criado_em', { ascending: false }),
      ]);
      const cli = c.data as Cliente | null;
      if (cli) {
        setNome(cli.nome);
        setTelefone(mascaraTelefone(cli.telefone ?? ''));
        setEmail(cli.email ?? '');
        setEndereco(cli.endereco ?? '');
        setObs(cli.observacoes ?? '');
      }
      setOrcamentos((o.data as Orcamento[]) ?? []);
    })();
  }, [id, novo]);

  async function salvar() {
    setErro(null);
    if (nome.trim().length < 2) return setErro('Informe o nome do cliente.');
    if (telefone && !telefoneValido(telefone)) return setErro('Telefone com DDD, ex.: (11) 98765-4321.');
    if (email && !emailValido(email)) return setErro('E-mail inválido.');
    setSalvando(true);
    const dados = {
      nome: nome.trim(),
      telefone: soDigitos(telefone) || null,
      email: email.trim().toLowerCase() || null,
      endereco: endereco.trim() || null,
      observacoes: obs.trim() || null,
    };
    const { error } = novo ? await supabase.from('clientes').insert(dados) : await supabase.from('clientes').update(dados).eq('id', id);
    setSalvando(false);
    if (error) return setErro('Não foi possível salvar. Tente de novo.');
    router.back();
  }

  function excluir() {
    Alert.alert('Excluir cliente?', 'Os orçamentos dele continuam salvos, mas sem o nome do cliente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('clientes').delete().eq('id', id);
          router.back();
        },
      },
    ]);
  }

  const fechado = orcamentos.filter((o) => ['aprovado', 'concluido', 'pago'].includes(o.status)).reduce((s, o) => s + Number(o.total), 0);

  return (
    <Tela rodape={<Botao titulo={novo ? 'Cadastrar cliente' : 'Salvar'} onPress={salvar} carregando={salvando} />}>
      <Stack.Screen
        options={{
          headerRight: novo
            ? undefined
            : () => (
                <Pressable onPress={excluir} hitSlop={12} accessibilityLabel="Excluir cliente">
                  <Ionicons name="trash-outline" size={22} color={cores.erro} />
                </Pressable>
              ),
        }}
      />
      <Cabecalho titulo={novo ? 'Novo cliente' : nome || 'Cliente'} subtitulo={novo ? 'Só o nome é obrigatório.' : undefined} />
      {erro ? <Aviso texto={erro} /> : null}

      {!novo ? (
        <View style={{ flexDirection: 'row', gap: espaco.s, marginBottom: espaco.l }}>
          <Botao
            titulo="Novo orçamento"
            estilo={{ flex: 1, height: 48 }}
            onPress={() => router.push({ pathname: '/orcamento/editar', params: { clienteId: id } })}
          />
          {telefone ? (
            <Botao titulo="WhatsApp" variante="secundario" estilo={{ flex: 1, height: 48 }} onPress={() => abrirWhatsApp('Olá! Tudo bem?', telefone)} />
          ) : null}
        </View>
      ) : null}

      <Campo rotulo="Nome" placeholder="Ex.: Maria Souza" value={nome} onChangeText={setNome} autoCapitalize="words" />
      <Campo rotulo="WhatsApp" placeholder="(11) 98765-4321" value={telefone} onChangeText={(t) => setTelefone(mascaraTelefone(t))} keyboardType="phone-pad" />
      <Campo rotulo="E-mail (opcional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Campo rotulo="Endereço do serviço (opcional)" placeholder="Rua, número, bairro" value={endereco} onChangeText={setEndereco} />
      <Campo rotulo="Anotações (opcional)" placeholder="Ex.: portão azul, interfone 12" value={obs} onChangeText={setObs} multiline />

      {!novo ? (
        <Secao titulo={`Histórico · ${orcamentos.length} orçamento${orcamentos.length === 1 ? '' : 's'}`}>
          {fechado > 0 ? <Text style={[fonte.pequeno, { marginBottom: espaco.s }]}>Total fechado com este cliente: {moeda(fechado)}</Text> : null}
          <View style={{ gap: espaco.s }}>
            {orcamentos.map((o) => (
              <CartaoOrcamento key={o.id} o={o} />
            ))}
          </View>
        </Secao>
      ) : null}
    </Tela>
  );
}
