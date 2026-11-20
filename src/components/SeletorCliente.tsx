import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Botao, Campo } from '@/components/ui';
import { Cliente, supabase } from '@/lib/supabase';
import { mascaraTelefone, soDigitos, telefoneValido } from '@/lib/validacao';
import { cores, espaco, fonte, raio } from '@/theme';

type Props = { visivel: boolean; aoFechar: () => void; aoEscolher: (c: Cliente) => void };

export function SeletorCliente({ visivel, aoFechar, aoEscolher }: Props) {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    setBusca('');
    setCriando(false);
    supabase
      .from('clientes')
      .select('*')
      .order('nome')
      .then(({ data }) => setLista((data as Cliente[]) ?? []));
  }, [visivel]);

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return b ? lista.filter((c) => c.nome.toLowerCase().includes(b) || (c.telefone ?? '').includes(b.replace(/\D/g, '') || '§')) : lista;
  }, [lista, busca]);

  async function criar() {
    setErro(null);
    if (nome.trim().length < 2) return setErro('Informe o nome.');
    if (telefone && !telefoneValido(telefone)) return setErro('WhatsApp com DDD.');
    setSalvando(true);
    const { data, error } = await supabase
      .from('clientes')
      .insert({ nome: nome.trim(), telefone: soDigitos(telefone) || null })
      .select('*')
      .single();
    setSalvando(false);
    if (error || !data) return setErro('Não foi possível salvar.');
    setNome('');
    setTelefone('');
    aoEscolher(data as Cliente);
  }

  return (
    <Modal visible={visivel} animationType="slide" presentationStyle="pageSheet" onRequestClose={aoFechar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
        <View style={s.topo}>
          <Text style={[fonte.titulo, { fontSize: 22, flex: 1 }]}>{criando ? 'Cliente novo' : 'Para quem é?'}</Text>
          <Pressable onPress={criando ? () => setCriando(false) : aoFechar} hitSlop={12} accessibilityLabel="Fechar">
            <Ionicons name="close" size={26} color={cores.tinta} />
          </Pressable>
        </View>

        {criando ? (
          <View style={{ padding: espaco.l }}>
            {erro ? <Aviso texto={erro} /> : null}
            <Campo rotulo="Nome" value={nome} onChangeText={setNome} autoCapitalize="words" autoFocus />
            <Campo rotulo="WhatsApp" value={telefone} onChangeText={(t) => setTelefone(mascaraTelefone(t))} keyboardType="phone-pad" placeholder="(11) 98765-4321" />
            <Botao titulo="Salvar e usar" onPress={criar} carregando={salvando} />
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: espaco.l, gap: espaco.s }}>
              <Pressable onPress={() => setCriando(true)} style={s.novo} accessibilityRole="button">
                <Ionicons name="person-add" size={20} color={cores.primariaEscura} />
                <Text style={{ fontWeight: '700', color: cores.primariaEscura, fontSize: 16 }}>Cadastrar cliente novo</Text>
              </Pressable>
              <View style={s.busca}>
                <Ionicons name="search" size={18} color={cores.textoSuave} />
                <TextInput value={busca} onChangeText={setBusca} placeholder="Buscar" placeholderTextColor={cores.textoSuave} style={{ flex: 1, fontSize: 16, color: cores.tinta }} />
              </View>
            </View>
            <FlatList
              data={visiveis}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ padding: espaco.l, gap: espaco.s }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => aoEscolher(item)} style={({ pressed }) => [s.linha, pressed && { opacity: 0.7 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[fonte.corpo, { fontWeight: '700', color: cores.tinta }]}>{item.nome}</Text>
                    {item.telefone ? <Text style={fonte.pequeno}>{mascaraTelefone(item.telefone)}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={cores.textoSuave} />
                </Pressable>
              )}
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', padding: espaco.l },
  novo: { flexDirection: 'row', alignItems: 'center', gap: espaco.s, padding: espaco.m, borderRadius: raio.m, backgroundColor: cores.primariaSuave },
  busca: { flexDirection: 'row', alignItems: 'center', gap: espaco.s, height: 48, borderRadius: raio.m, backgroundColor: cores.superficie, paddingHorizontal: espaco.m, borderWidth: 1.5, borderColor: cores.borda },
  linha: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.superficie, padding: espaco.m, borderRadius: raio.m },
});
