import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao, Campo, Chip, Vazio } from '@/components/ui';
import { dinheiroParaTexto, lerValor, mascaraDinheiro, moeda } from '@/lib/formato';
import { ItemCatalogo, supabase } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

type Edicao = { id?: string; tipo: 'servico' | 'material'; descricao: string; unidade: string; valor: string };

export default function Catalogo() {
  const [lista, setLista] = useState<ItemCatalogo[]>([]);
  const [busca, setBusca] = useState('');
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('catalogo').select('*').order('descricao');
    setLista((data as ItemCatalogo[]) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return b ? lista.filter((i) => i.descricao.toLowerCase().includes(b)) : lista;
  }, [lista, busca]);

  async function salvar() {
    if (!edicao || !edicao.descricao.trim()) return;
    setSalvando(true);
    const dados = { tipo: edicao.tipo, descricao: edicao.descricao.trim(), unidade: edicao.unidade.trim() || 'un', valor_unitario: lerValor(edicao.valor) };
    const { error } = edicao.id ? await supabase.from('catalogo').update(dados).eq('id', edicao.id) : await supabase.from('catalogo').insert(dados);
    setSalvando(false);
    if (error) return Alert.alert('Ops', error.code === '23505' ? 'Esse item já está na lista.' : 'Não foi possível salvar.');
    setEdicao(null);
    carregar();
  }

  function apagar(i: ItemCatalogo) {
    Alert.alert('Remover dos seus preços?', i.descricao, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('catalogo').delete().eq('id', i.id);
          carregar();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['bottom']}>
      <View style={{ paddingHorizontal: espaco.l, gap: espaco.m }}>
        <Text style={fonte.titulo}>Meus preços</Text>
        <Text style={fonte.subtitulo}>Cada item com valor que você usa num orçamento fica salvo aqui. Ajuste quando o preço mudar.</Text>
        <View style={s.busca}>
          <Ionicons name="search" size={18} color={cores.textoSuave} />
          <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar" placeholderTextColor={cores.textoSuave} style={{ flex: 1, fontSize: 16, color: cores.tinta }} />
        </View>
      </View>
      <FlatList
        data={visiveis}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: espaco.l, gap: espaco.s, paddingBottom: 110 }}
        ListEmptyComponent={<Vazio titulo="Nada salvo ainda" texto="Crie um orçamento com valores, ou adicione aqui seus serviços mais comuns." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setEdicao({ id: item.id, tipo: item.tipo, descricao: item.descricao, unidade: item.unidade, valor: dinheiroParaTexto(Number(item.valor_unitario)) })}
            onLongPress={() => apagar(item)}
            style={({ pressed }) => [s.linha, pressed && { opacity: 0.75 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[fonte.corpo, { fontWeight: '700', color: cores.tinta }]}>{item.descricao}</Text>
              <Text style={fonte.pequeno}>
                {item.tipo === 'servico' ? 'Serviço' : 'Material'} · por {item.unidade} · usado {item.usos}×
              </Text>
            </View>
            <Text style={{ fontWeight: '800', color: cores.tinta, fontSize: 16 }}>{moeda(item.valor_unitario)}</Text>
          </Pressable>
        )}
      />
      <View style={s.rodape}>
        <Botao titulo="+ Adicionar preço" onPress={() => setEdicao({ tipo: 'servico', descricao: '', unidade: 'un', valor: '' })} />
      </View>

      <Modal visible={!!edicao} transparent animationType="slide" onRequestClose={() => setEdicao(null)}>
        <View style={s.fundo}>
          <View style={s.folha}>
            <Text style={[fonte.titulo, { fontSize: 22, marginBottom: espaco.m }]}>{edicao?.id ? 'Editar preço' : 'Novo preço'}</Text>
            <View style={{ flexDirection: 'row', gap: espaco.s, marginBottom: espaco.m }}>
              {(['servico', 'material'] as const).map((t) => (
                <Chip key={t} rotulo={t === 'servico' ? 'Serviço' : 'Material'} ativo={edicao?.tipo === t} onPress={() => setEdicao((e) => e && { ...e, tipo: t })} />
              ))}
            </View>
            <Campo rotulo="Descrição" value={edicao?.descricao ?? ''} onChangeText={(t) => setEdicao((e) => e && { ...e, descricao: t })} placeholder="Ex.: Instalação de chuveiro" />
            <View style={{ flexDirection: 'row', gap: espaco.s }}>
              <View style={{ width: 100 }}>
                <Campo rotulo="Unidade" value={edicao?.unidade ?? ''} onChangeText={(t) => setEdicao((e) => e && { ...e, unidade: t })} autoCapitalize="none" />
              </View>
              <View style={{ flex: 1 }}>
                <Campo rotulo="Valor (R$)" value={edicao?.valor ?? ''} onChangeText={(t) => setEdicao((e) => e && { ...e, valor: mascaraDinheiro(t) })} keyboardType="number-pad" placeholder="0,00" />
              </View>
            </View>
            <Botao titulo="Salvar" onPress={salvar} carregando={salvando} />
            <Botao titulo="Cancelar" variante="texto" onPress={() => setEdicao(null)} />
            {edicao?.id ? <Text style={[fonte.pequeno, { textAlign: 'center' }]}>Para remover, segure o dedo sobre o item na lista.</Text> : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  busca: { flexDirection: 'row', alignItems: 'center', gap: espaco.s, height: 48, borderRadius: raio.m, backgroundColor: cores.superficie, paddingHorizontal: espaco.m, borderWidth: 1.5, borderColor: cores.borda },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, backgroundColor: cores.superficie, padding: espaco.m, borderRadius: raio.m },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: espaco.l, paddingBottom: espaco.xl, backgroundColor: cores.fundo },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  folha: { backgroundColor: cores.fundo, borderTopLeftRadius: raio.g, borderTopRightRadius: raio.g, padding: espaco.l, paddingBottom: espaco.xxl },
});
