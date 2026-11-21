import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao } from '@/components/ui';
import { dinheiroParaTexto, lerValor, mascaraDinheiro, moeda, numeroBR } from '@/lib/formato';
import { ItemCatalogo, supabase } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

export type ItemForm = { tipo: 'servico' | 'material'; descricao: string; qtd: string; unidade: string; valor: string };

type Props = {
  visivel: boolean;
  tipo: 'servico' | 'material';
  inicial?: ItemForm | null;
  aoFechar: () => void;
  aoSalvar: (item: ItemForm) => void;
  aoRemover?: () => void;
};

const UNIDADES_SERVICO = ['un', 'h', 'dia', 'm²', 'm', 'ponto'];
const UNIDADES_MATERIAL = ['un', 'm', 'm²', 'kg', 'L', 'saco', 'lata', 'rolo', 'cx', 'pç'];

/**
 * Folha de baixo para adicionar/editar UM item.
 * Ao digitar, sugere o que já foi usado antes (com o último preço).
 */
export function ItemSheet({ visivel, tipo, inicial, aoFechar, aoSalvar, aoRemover }: Props) {
  const { bottom } = useSafeAreaInsets();
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>([]);
  const [descricao, setDescricao] = useState('');
  const [qtd, setQtd] = useState('1');
  const [unidade, setUnidade] = useState('un');
  const [valor, setValor] = useState('');
  const [escolheuSugestao, setEscolheuSugestao] = useState(false);
  const valorRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visivel) return;
    setDescricao(inicial?.descricao ?? '');
    setQtd(inicial?.qtd ?? '1');
    setUnidade(inicial?.unidade ?? 'un');
    setValor(inicial?.valor ?? '');
    setEscolheuSugestao(!!inicial);
    supabase
      .from('catalogo')
      .select('*')
      .eq('tipo', tipo)
      .order('usos', { ascending: false })
      .limit(200)
      .then(({ data }) => setCatalogo((data as ItemCatalogo[]) ?? []));
  }, [visivel, tipo, inicial]);

  const sugestoes = useMemo(() => {
    if (escolheuSugestao) return [];
    const b = descricao.trim().toLowerCase();
    const lista = b ? catalogo.filter((c) => c.descricao.toLowerCase().includes(b)) : catalogo;
    return lista.slice(0, 6);
  }, [catalogo, descricao, escolheuSugestao]);

  function usar(c: ItemCatalogo) {
    setDescricao(c.descricao);
    setUnidade(c.unidade);
    setValor(dinheiroParaTexto(Number(c.valor_unitario)));
    setEscolheuSugestao(true);
    setTimeout(() => valorRef.current?.focus(), 150);
  }

  const passo = (d: number) => setQtd((q) => numeroBR(Math.max(1, Math.round((lerValor(q) + d) * 100) / 100)));
  const total = lerValor(qtd) * lerValor(valor);
  const unidades = tipo === 'servico' ? UNIDADES_SERVICO : UNIDADES_MATERIAL;
  const podeSalvar = descricao.trim().length > 0 && lerValor(qtd) > 0;
  const nome = tipo === 'servico' ? 'serviço' : 'material';

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar}>
      <Pressable style={s.fundo} onPress={aoFechar} accessibilityLabel="Fechar" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.ancora}>
        <View style={[s.folha, { paddingBottom: Math.max(bottom, espaco.m) + espaco.s }]}>
          <View style={s.alca} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: espaco.m }}>
            <Text style={[fonte.titulo, { fontSize: 21, flex: 1 }]}>
              {inicial ? `Editar ${nome}` : `Adicionar ${nome}`}
            </Text>
            {aoRemover ? (
              <Pressable onPress={aoRemover} hitSlop={12} accessibilityLabel="Remover item" style={{ marginRight: espaco.m }}>
                <Ionicons name="trash-outline" size={22} color={cores.erro} />
              </Pressable>
            ) : null}
            <Pressable onPress={aoFechar} hitSlop={12} accessibilityLabel="Fechar">
              <Ionicons name="close" size={26} color={cores.tinta} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }}>
            <Text style={s.rotulo}>{tipo === 'servico' ? 'Qual serviço?' : 'Qual material?'}</Text>
            <TextInput
              value={descricao}
              onChangeText={(t) => {
                setDescricao(t);
                setEscolheuSugestao(false);
              }}
              placeholder={tipo === 'servico' ? 'Ex.: Troca de tomada' : 'Ex.: Fio 2,5 mm'}
              placeholderTextColor={cores.textoSuave}
              style={s.campoGrande}
              autoFocus={!inicial}
              returnKeyType="next"
              onSubmitEditing={() => valorRef.current?.focus()}
            />

            {sugestoes.length ? (
              <View style={{ marginTop: espaco.s, gap: 6 }}>
                <Text style={fonte.pequeno}>{descricao.trim() ? 'Já usados por você' : 'Seus mais usados'}</Text>
                {sugestoes.map((c) => (
                  <Pressable key={c.id} onPress={() => usar(c)} style={({ pressed }) => [s.sugestao, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="time-outline" size={18} color={cores.textoSuave} />
                    <Text style={[fonte.corpo, { flex: 1, color: cores.tinta }]} numberOfLines={1}>
                      {c.descricao}
                    </Text>
                    <Text style={{ fontWeight: '800', color: cores.primariaEscura }}>
                      {moeda(c.valor_unitario)}/{c.unidade}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: espaco.m, marginTop: espaco.l }}>
              <View>
                <Text style={s.rotulo}>Quantidade</Text>
                <View style={s.stepper}>
                  <Pressable onPress={() => passo(-1)} style={s.passo} accessibilityLabel="Diminuir">
                    <Ionicons name="remove" size={22} color={cores.tinta} />
                  </Pressable>
                  <TextInput
                    value={qtd}
                    onChangeText={(t) => setQtd(t.replace(/[^\d,.]/g, ''))}
                    keyboardType="decimal-pad"
                    style={s.qtd}
                    selectTextOnFocus
                  />
                  <Pressable onPress={() => passo(1)} style={s.passo} accessibilityLabel="Aumentar">
                    <Ionicons name="add" size={22} color={cores.tinta} />
                  </Pressable>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rotulo}>Valor por {unidade}</Text>
                <View style={s.valorCaixa}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: cores.textoSuave }}>R$</Text>
                  <TextInput
                    ref={valorRef}
                    value={valor}
                    onChangeText={(t) => setValor(mascaraDinheiro(t))}
                    keyboardType="number-pad"
                    placeholder="0,00"
                    placeholderTextColor={cores.textoSuave}
                    style={s.valor}
                  />
                </View>
              </View>
            </View>

            <Text style={[s.rotulo, { marginTop: espaco.m }]}>Unidade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espaco.s }} keyboardShouldPersistTaps="handled">
              {unidades.map((u) => (
                <Pressable key={u} onPress={() => setUnidade(u)} style={[s.unidade, unidade === u && s.unidadeAtiva]}>
                  <Text style={[s.unidadeTexto, unidade === u && { color: cores.primariaEscura }]}>{u}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </ScrollView>

          <View style={s.rodape}>
            <View style={{ flex: 1 }}>
              <Text style={fonte.pequeno}>Total do item</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: cores.tinta }}>{moeda(total)}</Text>
            </View>
            <Botao
              titulo={inicial ? 'Salvar' : 'Adicionar'}
              desabilitado={!podeSalvar}
              onPress={() => aoSalvar({ tipo, descricao: descricao.trim(), qtd, unidade, valor })}
              estilo={{ minWidth: 150 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  fundo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  ancora: { flex: 1, justifyContent: 'flex-end' },
  folha: { backgroundColor: cores.fundo, borderTopLeftRadius: raio.g, borderTopRightRadius: raio.g, paddingHorizontal: espaco.l, paddingTop: espaco.s },
  alca: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: cores.borda, marginBottom: espaco.m },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto, marginBottom: 6 },
  campoGrande: { height: 56, borderRadius: raio.m, borderWidth: 1.5, borderColor: cores.primaria, backgroundColor: cores.superficie, paddingHorizontal: espaco.m, fontSize: 18, color: cores.tinta },
  sugestao: { flexDirection: 'row', alignItems: 'center', gap: espaco.s, backgroundColor: cores.superficie, borderRadius: raio.p, paddingHorizontal: espaco.m, paddingVertical: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: raio.m, backgroundColor: cores.superficie, borderWidth: 1.5, borderColor: cores.borda },
  passo: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
  qtd: { width: 52, textAlign: 'center', fontSize: 18, fontWeight: '700', color: cores.tinta },
  valorCaixa: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 56, borderRadius: raio.m, backgroundColor: cores.superficie, borderWidth: 1.5, borderColor: cores.borda, paddingHorizontal: espaco.m },
  valor: { flex: 1, fontSize: 20, fontWeight: '800', color: cores.tinta, height: '100%' },
  unidade: { paddingHorizontal: 16, height: 40, borderRadius: raio.total, borderWidth: 1.5, borderColor: cores.borda, backgroundColor: cores.superficie, justifyContent: 'center' },
  unidadeAtiva: { borderColor: cores.primaria, backgroundColor: cores.primariaSuave },
  unidadeTexto: { fontSize: 15, fontWeight: '700', color: cores.texto },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, marginTop: espaco.l },
});
