import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartaoOrcamento } from '@/components/CartaoOrcamento';
import { Botao, Chip, Vazio } from '@/components/ui';
import { STATUS } from '@/lib/formato';
import { Orcamento, StatusOrcamento, supabase } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

const FILTROS: (StatusOrcamento | 'todos')[] = ['todos', 'rascunho', 'enviado', 'aprovado', 'concluido', 'pago', 'recusado'];

export default function Orcamentos() {
  const [lista, setLista] = useState<Orcamento[]>([]);
  const [filtro, setFiltro] = useState<StatusOrcamento | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase
      .from('orcamentos')
      .select('*, cliente:clientes(id, nome, telefone, endereco)')
      .order('criado_em', { ascending: false })
      .limit(300);
    setLista((data as Orcamento[]) ?? []);
    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return lista.filter(
      (o) =>
        (filtro === 'todos' || o.status === filtro) &&
        (!b || o.titulo.toLowerCase().includes(b) || (o.cliente?.nome ?? '').toLowerCase().includes(b) || String(o.numero) === b),
    );
  }, [lista, filtro, busca]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <View style={{ paddingHorizontal: espaco.l, paddingTop: espaco.m, gap: espaco.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[fonte.titulo, { flex: 1 }]}>Orçamentos</Text>
          <Pressable onPress={() => router.push('/orcamento/editar')} style={s.mais} accessibilityLabel="Novo orçamento">
            <Ionicons name="add" size={26} color="#fff" />
          </Pressable>
        </View>
        <View style={s.busca}>
          <Ionicons name="search" size={18} color={cores.textoSuave} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por cliente, serviço ou número"
            placeholderTextColor={cores.textoSuave}
            style={{ flex: 1, fontSize: 16, color: cores.tinta }}
          />
        </View>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espaco.s, padding: espaco.l, paddingVertical: espaco.m }}>
          {FILTROS.map((f) => (
            <Chip key={f} rotulo={f === 'todos' ? 'Todos' : STATUS[f].rotulo} ativo={filtro === f} onPress={() => setFiltro(f)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={visiveis}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => <CartaoOrcamento o={item} />}
        contentContainerStyle={{ paddingHorizontal: espaco.l, paddingBottom: espaco.xl, gap: espaco.s }}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={cores.primaria} />}
        ListEmptyComponent={
          carregando ? null : (
            <Vazio
              titulo={lista.length ? 'Nada por aqui' : 'Nenhum orçamento ainda'}
              texto={lista.length ? 'Tente outro filtro ou busca.' : 'Crie o primeiro e mande pelo WhatsApp em 1 minuto.'}
              acao={lista.length ? undefined : <Botao titulo="Novo orçamento" onPress={() => router.push('/orcamento/editar')} />}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  mais: { width: 48, height: 48, borderRadius: 16, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.s,
    height: 48,
    borderRadius: raio.m,
    backgroundColor: cores.superficie,
    paddingHorizontal: espaco.m,
    borderWidth: 1.5,
    borderColor: cores.borda,
  },
});
