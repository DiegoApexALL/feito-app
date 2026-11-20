import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SeletorCliente } from '@/components/SeletorCliente';
import { Aviso, Botao, Campo, Chip, Secao } from '@/components/ui';
import { dinheiroParaTexto, lerValor, mascaraDinheiro, moeda, numeroBR } from '@/lib/formato';
import { montarItens } from '@/lib/montarItens';
import { Cliente, ItemOrcamento, Orcamento, supabase } from '@/lib/supabase';
import { mascaraTelefone } from '@/lib/validacao';
import { cores, espaco, fonte, raio } from '@/theme';

type ItemEdit = { chave: string; tipo: 'servico' | 'material'; descricao: string; qtd: string; unidade: string; valor: string };

let seq = 0;
const novaChave = () => `i${Date.now()}${seq++}`;

const paraEdit = (i: ItemOrcamento): ItemEdit => ({
  chave: novaChave(),
  tipo: i.tipo,
  descricao: i.descricao,
  qtd: numeroBR(Number(i.quantidade)),
  unidade: i.unidade,
  valor: dinheiroParaTexto(Number(i.valor_unitario)),
});

const vazio = (tipo: 'servico' | 'material'): ItemEdit => ({ chave: novaChave(), tipo, descricao: '', qtd: '1', unidade: tipo === 'material' ? 'un' : 'un', valor: '' });

const UNIDADES = ['un', 'm', 'm²', 'kg', 'L', 'saco', 'lata', 'rolo', 'cx', 'h', 'dia'];
const VALIDADES = [7, 15, 30];
const PAGAMENTOS = ['Pix', '50% de entrada e 50% no fim', 'Pix ou cartão', 'Dinheiro'];

export default function EditarOrcamento() {
  const { id, clienteId, duplicarDe } = useLocalSearchParams<{ id?: string; clienteId?: string; duplicarDe?: string }>();
  const editando = !!id;

  const [carregando, setCarregando] = useState(!!(id || duplicarDe));
  const [cliente, setCliente] = useState<Pick<Cliente, 'id' | 'nome' | 'telefone'> | null>(null);
  const [seletor, setSeletor] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [itens, setItens] = useState<ItemEdit[]>([]);
  const [desconto, setDesconto] = useState('');
  const [validade, setValidade] = useState(15);
  const [prazo, setPrazo] = useState('');
  const [pagamento, setPagamento] = useState('Pix');
  const [obs, setObs] = useState('');
  const [mais, setMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [dica, setDica] = useState<string | null>(null);

  // Carrega para editar ou duplicar
  useEffect(() => {
    const base = id || duplicarDe;
    if (!base) return;
    (async () => {
      const { data } = await supabase
        .from('orcamentos')
        .select('*, cliente:clientes(id, nome, telefone, endereco), itens:orcamento_itens(*)')
        .eq('id', base)
        .maybeSingle();
      const o = data as Orcamento | null;
      if (o) {
        setCliente(o.cliente ?? null);
        setTitulo(duplicarDe ? `${o.titulo} (cópia)` : o.titulo);
        setDescricao(o.descricao ?? '');
        setItens((o.itens ?? []).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map(paraEdit));
        setDesconto(dinheiroParaTexto(Number(o.desconto)));
        setValidade(o.validade_dias);
        setPrazo(o.prazo_execucao ?? '');
        setPagamento(o.forma_pagamento ?? '');
        setObs(o.observacoes ?? '');
        setMais(!!(o.prazo_execucao || o.observacoes || Number(o.desconto)));
      }
      setCarregando(false);
    })();
  }, [id, duplicarDe]);

  // Cliente vindo da tela do cliente
  useEffect(() => {
    if (!clienteId || id) return;
    supabase
      .from('clientes')
      .select('id, nome, telefone')
      .eq('id', clienteId)
      .maybeSingle()
      .then(({ data }) => data && setCliente(data));
  }, [clienteId, id]);

  const subtotal = useMemo(() => itens.reduce((s, i) => s + lerValor(i.qtd) * lerValor(i.valor), 0), [itens]);
  const total = Math.max(subtotal - lerValor(desconto), 0);

  function montar() {
    const novos = montarItens(descricao);
    if (!novos.length) {
      setDica('Descreva o serviço com quantidades e valores, ex.: "troquei 3 tomadas a 50 cada e mão de obra 200".');
      return;
    }
    setItens((atual) => [...atual.filter((i) => i.descricao.trim()), ...novos.map(paraEdit)]);
    if (!titulo.trim()) setTitulo(novos.find((n) => n.tipo === 'servico')?.descricao ?? novos[0].descricao);
    const semValor = novos.filter((n) => !n.valor_unitario).length;
    setDica(
      `${novos.length} ${novos.length === 1 ? 'item montado' : 'itens montados'}. Confira abaixo${semValor ? ` e preencha o valor de ${semValor}` : ''}.`,
    );
  }

  const alterar = (chave: string, campo: Partial<ItemEdit>) => setItens((l) => l.map((i) => (i.chave === chave ? { ...i, ...campo } : i)));
  const remover = (chave: string) => setItens((l) => l.filter((i) => i.chave !== chave));

  async function salvar() {
    setErro(null);
    const validos = itens.filter((i) => i.descricao.trim());
    if (titulo.trim().length < 2) return setErro('Dê um título, ex.: "Troca de tomadas".');
    if (!validos.length) return setErro('Adicione pelo menos um serviço ou material.');
    if (validos.some((i) => lerValor(i.qtd) <= 0)) return setErro('Quantidade precisa ser maior que zero.');
    if (lerValor(desconto) > subtotal) return setErro('O desconto é maior que o total.');

    setSalvando(true);
    const dados = {
      cliente_id: cliente?.id ?? null,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      desconto: lerValor(desconto),
      validade_dias: validade,
      prazo_execucao: prazo.trim() || null,
      forma_pagamento: pagamento.trim() || null,
      observacoes: obs.trim() || null,
    };

    let orcId = id;
    if (editando) {
      const { error } = await supabase.from('orcamentos').update(dados).eq('id', id);
      if (error) return falhar(error.message);
      const del = await supabase.from('orcamento_itens').delete().eq('orcamento_id', id);
      if (del.error) return falhar(del.error.message);
    } else {
      const { data, error } = await supabase.from('orcamentos').insert(dados).select('id').single();
      if (error || !data) return falhar(error?.message);
      orcId = data.id;
    }

    const linhas = validos.map((i, ordem) => ({
      orcamento_id: orcId,
      tipo: i.tipo,
      descricao: i.descricao.trim(),
      quantidade: lerValor(i.qtd),
      unidade: i.unidade || 'un',
      valor_unitario: lerValor(i.valor),
      ordem,
    }));
    const ins = await supabase.from('orcamento_itens').insert(linhas);
    if (ins.error) return falhar(ins.error.message);

    setSalvando(false);
    if (editando) router.back();
    else router.replace({ pathname: '/orcamento/[id]', params: { id: orcId!, recemCriado: '1' } });
  }

  function falhar(msg?: string) {
    setSalvando(false);
    if (msg?.includes('LIMITE_PLANO_GRATIS')) {
      Alert.alert('Limite do plano grátis', 'Você já fez 5 orçamentos este mês. No Pro eles são ilimitados e sem a marca do Feito!.', [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Ver o Pro', onPress: () => router.push('/planos') },
      ]);
      return;
    }
    setErro('Não foi possível salvar. Verifique a internet e tente de novo.');
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.primaria} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <View style={s.barra}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Fechar">
          <Ionicons name="close" size={26} color={cores.tinta} />
        </Pressable>
        <Text style={[fonte.rotulo, { fontSize: 17, color: cores.tinta }]}>{editando ? 'Editar orçamento' : 'Novo orçamento'}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: espaco.l, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          {erro ? <Aviso texto={erro} /> : null}

          {/* Cliente */}
          <Pressable onPress={() => setSeletor(true)} style={s.cliente} accessibilityRole="button">
            <View style={s.clienteIcone}>
              <Ionicons name="person" size={20} color={cores.primariaEscura} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fonte.pequeno}>Cliente</Text>
              <Text style={[fonte.corpo, { fontWeight: '700', color: cores.tinta }]}>{cliente?.nome ?? 'Escolher cliente'}</Text>
              {cliente?.telefone ? <Text style={fonte.pequeno}>{mascaraTelefone(cliente.telefone)}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={cores.textoSuave} />
          </Pressable>

          {/* Fale o serviço */}
          <View style={s.falar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.s, marginBottom: espaco.s }}>
              <Ionicons name="mic" size={20} color={cores.primariaEscura} />
              <Text style={[fonte.rotulo, { color: cores.tinta, flex: 1 }]}>O que você fez ou vai fazer?</Text>
            </View>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              multiline
              placeholder={'Toque no microfone do teclado e fale. Ex.: "troquei 3 tomadas a 50 cada, 10 metros de fio por 45 e mão de obra 200"'}
              placeholderTextColor={cores.textoSuave}
              style={s.falarTexto}
              textAlignVertical="top"
            />
            <Botao titulo="Montar itens" onPress={montar} desabilitado={!descricao.trim()} estilo={{ height: 48, marginTop: espaco.s }} />
            {dica ? <Text style={[fonte.pequeno, { marginTop: espaco.s, color: cores.texto }]}>{dica}</Text> : null}
          </View>

          <Campo rotulo="Título do orçamento" placeholder="Ex.: Troca de tomadas da cozinha" value={titulo} onChangeText={setTitulo} />

          {/* Itens */}
          <Secao titulo="Serviços e materiais">
            <View style={{ gap: espaco.s }}>
              {itens.map((i) => (
                <View key={i.chave} style={s.item}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.s }}>
                    <View style={s.alternar}>
                      {(['servico', 'material'] as const).map((t) => (
                        <Pressable key={t} onPress={() => alterar(i.chave, { tipo: t })} style={[s.alternarOp, i.tipo === t && s.alternarAtivo]}>
                          <Text style={[s.alternarTexto, i.tipo === t && { color: cores.tinta }]}>{t === 'servico' ? 'Serviço' : 'Material'}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={{ flex: 1 }} />
                    <Pressable onPress={() => remover(i.chave)} hitSlop={12} accessibilityLabel="Remover item">
                      <Ionicons name="trash-outline" size={20} color={cores.textoSuave} />
                    </Pressable>
                  </View>
                  <TextInput
                    value={i.descricao}
                    onChangeText={(t) => alterar(i.chave, { descricao: t })}
                    placeholder={i.tipo === 'servico' ? 'Ex.: Troca de tomada' : 'Ex.: Fio 2,5 mm'}
                    placeholderTextColor={cores.textoSuave}
                    style={s.itemDesc}
                  />
                  <View style={{ flexDirection: 'row', gap: espaco.s, alignItems: 'flex-end' }}>
                    <View style={{ width: 70 }}>
                      <Text style={s.mini}>Qtd</Text>
                      <TextInput value={i.qtd} onChangeText={(t) => alterar(i.chave, { qtd: t.replace(/[^\d,.]/g, '') })} keyboardType="decimal-pad" style={s.itemCampo} />
                    </View>
                    <Pressable
                      style={{ width: 64 }}
                      onPress={() => alterar(i.chave, { unidade: UNIDADES[(UNIDADES.indexOf(i.unidade) + 1) % UNIDADES.length] })}
                      accessibilityLabel="Trocar unidade"
                    >
                      <Text style={s.mini}>Unid.</Text>
                      <View style={[s.itemCampo, { justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 16, color: cores.tinta, fontWeight: '600' }}>{i.unidade}</Text>
                      </View>
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={s.mini}>Valor un. (R$)</Text>
                      <TextInput
                        value={i.valor}
                        onChangeText={(t) => alterar(i.chave, { valor: mascaraDinheiro(t) })}
                        keyboardType="number-pad"
                        placeholder="0,00"
                        placeholderTextColor={cores.textoSuave}
                        style={s.itemCampo}
                      />
                    </View>
                  </View>
                  <Text style={[fonte.pequeno, { textAlign: 'right', fontWeight: '700', color: cores.texto }]}>
                    {moeda(lerValor(i.qtd) * lerValor(i.valor))}
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: espaco.s }}>
                <Botao titulo="+ Serviço" variante="secundario" estilo={{ flex: 1, height: 48 }} onPress={() => setItens((l) => [...l, vazio('servico')])} />
                <Botao titulo="+ Material" variante="secundario" estilo={{ flex: 1, height: 48 }} onPress={() => setItens((l) => [...l, vazio('material')])} />
              </View>
            </View>
          </Secao>

          {/* Condições */}
          <Secao titulo="Condições">
            <Text style={[fonte.rotulo, { marginBottom: espaco.s }]}>Validade</Text>
            <View style={s.chips}>
              {VALIDADES.map((v) => (
                <Chip key={v} rotulo={`${v} dias`} ativo={validade === v} onPress={() => setValidade(v)} />
              ))}
            </View>
            <Text style={[fonte.rotulo, { marginBottom: espaco.s, marginTop: espaco.m }]}>Forma de pagamento</Text>
            <View style={[s.chips, { marginBottom: espaco.m }]}>
              {PAGAMENTOS.map((p) => (
                <Chip key={p} rotulo={p} ativo={pagamento === p} onPress={() => setPagamento(p)} />
              ))}
            </View>
            {mais ? (
              <>
                <Campo rotulo="Prazo de execução" placeholder="Ex.: 2 dias úteis" value={prazo} onChangeText={setPrazo} />
                <Campo rotulo="Desconto (R$)" placeholder="0,00" value={desconto} onChangeText={(t) => setDesconto(mascaraDinheiro(t))} keyboardType="number-pad" />
                <Campo rotulo="Observações" placeholder="Ex.: Garantia de 90 dias no serviço" value={obs} onChangeText={setObs} multiline />
              </>
            ) : (
              <Botao titulo="+ Prazo, desconto e observações" variante="texto" onPress={() => setMais(true)} />
            )}
          </Secao>
        </ScrollView>

        {/* Total fixo embaixo */}
        <View style={s.rodape}>
          <View style={{ flex: 1 }}>
            <Text style={fonte.pequeno}>Total{lerValor(desconto) ? ' com desconto' : ''}</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: cores.tinta }}>{moeda(total)}</Text>
          </View>
          <Botao titulo={editando ? 'Salvar' : 'Criar orçamento'} onPress={salvar} carregando={salvando} estilo={{ minWidth: 170 }} />
        </View>
      </KeyboardAvoidingView>

      <SeletorCliente
        visivel={seletor}
        aoFechar={() => setSeletor(false)}
        aoEscolher={(c) => {
          setCliente(c);
          setSeletor(false);
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: espaco.l, paddingVertical: espaco.m },
  cliente: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, backgroundColor: cores.superficie, padding: espaco.m, borderRadius: raio.m, marginBottom: espaco.m },
  clienteIcone: { width: 44, height: 44, borderRadius: 14, backgroundColor: cores.primariaSuave, alignItems: 'center', justifyContent: 'center' },
  falar: { backgroundColor: cores.superficie, borderRadius: raio.m, padding: espaco.m, marginBottom: espaco.l, borderWidth: 1.5, borderColor: cores.primariaSuave },
  falarTexto: { minHeight: 96, fontSize: 17, lineHeight: 24, color: cores.tinta, backgroundColor: cores.fundo, borderRadius: raio.p, padding: espaco.m },
  item: { backgroundColor: cores.superficie, borderRadius: raio.m, padding: espaco.m, gap: espaco.s },
  itemDesc: { fontSize: 17, fontWeight: '600', color: cores.tinta, borderBottomWidth: 1.5, borderBottomColor: cores.borda, paddingVertical: 8 },
  itemCampo: { height: 44, borderRadius: raio.p, backgroundColor: cores.fundo, paddingHorizontal: 10, fontSize: 16, color: cores.tinta },
  mini: { fontSize: 12, color: cores.textoSuave, marginBottom: 4, fontWeight: '600' },
  alternar: { flexDirection: 'row', backgroundColor: cores.fundo, borderRadius: raio.p, padding: 3 },
  alternarOp: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  alternarAtivo: { backgroundColor: cores.superficie, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  alternarTexto: { fontSize: 13, fontWeight: '700', color: cores.textoSuave },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.m,
    paddingHorizontal: espaco.l,
    paddingVertical: espaco.m,
    backgroundColor: cores.superficie,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
});
