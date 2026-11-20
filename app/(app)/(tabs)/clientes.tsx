import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao, Vazio } from '@/components/ui';
import { Cliente, supabase } from '@/lib/supabase';
import { mascaraTelefone } from '@/lib/validacao';
import { cores, espaco, fonte, raio } from '@/theme';

const iniciais = (n: string) =>
  n
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export default function Clientes() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase.from('clientes').select('*').order('nome');
    setLista((data as Cliente[]) ?? []);
    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase();
    if (!b) return lista;
    const d = b.replace(/\D/g, '');
    return lista.filter((c) => c.nome.toLowerCase().includes(b) || (d && (c.telefone ?? '').includes(d)));
  }, [lista, busca]);

  const novo = () => router.push({ pathname: '/cliente/[id]', params: { id: 'novo' } });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <View style={{ paddingHorizontal: espaco.l, paddingTop: espaco.m, gap: espaco.m, paddingBottom: espaco.m }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[fonte.titulo, { flex: 1 }]}>Clientes</Text>
          <Pressable onPress={novo} style={s.mais} accessibilityLabel="Novo cliente">
            <Ionicons name="person-add" size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={s.busca}>
          <Ionicons name="search" size={18} color={cores.textoSuave} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por nome ou telefone"
            placeholderTextColor={cores.textoSuave}
            style={{ flex: 1, fontSize: 16, color: cores.tinta }}
          />
        </View>
      </View>
      <FlatList
        data={visiveis}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: espaco.l, paddingBottom: espaco.xl, gap: espaco.s }}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={cores.primaria} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/cliente/[id]', params: { id: item.id } })}
            style={({ pressed }) => [s.linha, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
          >
            <View style={s.avatar}>
              <Text style={{ color: cores.primariaEscura, fontWeight: '800' }}>{iniciais(item.nome)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[fonte.corpo, { fontWeight: '700', color: cores.tinta }]}>{item.nome}</Text>
              <Text style={fonte.pequeno}>{item.telefone ? mascaraTelefone(item.telefone) : 'Sem telefone'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={cores.textoSuave} />
          </Pressable>
        )}
        ListEmptyComponent={
          carregando ? null : (
            <Vazio
              titulo={lista.length ? 'Ninguém encontrado' : 'Sua carteira de clientes'}
              texto={lista.length ? 'Confira o nome ou o número.' : 'Cadastre aqui ou direto ao criar um orçamento. O histórico de cada um fica guardado.'}
              acao={lista.length ? undefined : <Botao titulo="Cadastrar cliente" onPress={novo} />}
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
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, backgroundColor: cores.superficie, padding: espaco.m, borderRadius: raio.m },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: cores.primariaSuave, alignItems: 'center', justifyContent: 'center' },
});
