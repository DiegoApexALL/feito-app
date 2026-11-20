import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Vazio } from '@/components/ui';
import { moeda } from '@/lib/formato';
import { ItemCatalogo, supabase } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

type Props = { visivel: boolean; aoFechar: () => void; aoEscolher: (itens: ItemCatalogo[]) => void };

/** Escolher serviços/materiais já usados antes, com o último preço cobrado. */
export function SeletorCatalogo({ visivel, aoFechar, aoEscolher }: Props) {
  const [lista, setLista] = useState<ItemCatalogo[]>([]);
  const [busca, setBusca] = useState('');
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!visivel) return;
    setBusca('');
    setMarcados({});
    supabase
      .from('catalogo')
      .select('*')
      .order('usos', { ascending: false })
      .limit(300)
      .then(({ data }) => setLista((data as ItemCatalogo[]) ?? []));
  }, [visivel]);

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return b ? lista.filter((i) => i.descricao.toLowerCase().includes(b)) : lista;
  }, [lista, busca]);

  const qtd = Object.values(marcados).filter(Boolean).length;

  return (
    <Modal visible={visivel} animationType="slide" presentationStyle="pageSheet" onRequestClose={aoFechar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
        <View style={s.topo}>
          <Text style={[fonte.titulo, { fontSize: 22, flex: 1 }]}>Meus preços</Text>
          <Pressable onPress={aoFechar} hitSlop={12} accessibilityLabel="Fechar">
            <Ionicons name="close" size={26} color={cores.tinta} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: espaco.l }}>
          <View style={s.busca}>
            <Ionicons name="search" size={18} color={cores.textoSuave} />
            <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar serviço ou material" placeholderTextColor={cores.textoSuave} style={{ flex: 1, fontSize: 16, color: cores.tinta }} />
          </View>
        </View>
        <FlatList
          data={visiveis}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: espaco.l, gap: espaco.s, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Vazio titulo="Ainda vazio" texto="Cada item que você coloca num orçamento fica salvo aqui com o preço, para usar de novo com um toque." />
          }
          renderItem={({ item }) => {
            const on = !!marcados[item.id];
            return (
              <Pressable
                onPress={() => setMarcados((m) => ({ ...m, [item.id]: !on }))}
                style={[s.linha, on && { borderColor: cores.primaria, backgroundColor: cores.primariaSuave }]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? cores.primariaEscura : cores.textoSuave} />
                <View style={{ flex: 1 }}>
                  <Text style={[fonte.corpo, { fontWeight: '700', color: cores.tinta }]}>{item.descricao}</Text>
                  <Text style={fonte.pequeno}>
                    {item.tipo === 'servico' ? 'Serviço' : 'Material'} · por {item.unidade}
                  </Text>
                </View>
                <Text style={{ fontWeight: '800', color: cores.tinta }}>{moeda(item.valor_unitario)}</Text>
              </Pressable>
            );
          }}
        />
        {qtd ? (
          <View style={s.rodape}>
            <Pressable
              onPress={() => aoEscolher(lista.filter((i) => marcados[i.id]))}
              style={s.botao}
              accessibilityRole="button"
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>
                Adicionar {qtd} {qtd === 1 ? 'item' : 'itens'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', padding: espaco.l },
  busca: { flexDirection: 'row', alignItems: 'center', gap: espaco.s, height: 48, borderRadius: raio.m, backgroundColor: cores.superficie, paddingHorizontal: espaco.m, borderWidth: 1.5, borderColor: cores.borda },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, backgroundColor: cores.superficie, padding: espaco.m, borderRadius: raio.m, borderWidth: 1.5, borderColor: 'transparent' },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: espaco.l, backgroundColor: cores.fundo },
  botao: { height: 56, borderRadius: raio.m, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
});
