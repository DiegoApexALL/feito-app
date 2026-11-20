import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FotosServico } from '@/components/FotosServico';
import { QRPix } from '@/components/QRPix';
import { Aviso, Botao, Cartao, Etiqueta, Secao } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { abrirWhatsApp, compartilharPdf, mensagemWhatsApp, pixDoOrcamento } from '@/lib/documento';
import { dataBR, linkPublico, moeda, numeroBR, tempoRelativo } from '@/lib/formato';
import { DadosPagamento, Orcamento, planoAtivo, StatusOrcamento, supabase } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

export default function OrcamentoTela() {
  const { id, recemCriado } = useLocalSearchParams<{ id: string; recemCriado?: string }>();
  const { prestador } = useAuth();
  const [o, setO] = useState<Orcamento | null>(null);
  const [pag, setPag] = useState<DadosPagamento | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [qrAberto, setQrAberto] = useState(false);

  const carregar = useCallback(async () => {
    const [r, p] = await Promise.all([
      supabase.from('orcamentos').select('*, cliente:clientes(id, nome, telefone, endereco), itens:orcamento_itens(*), fotos:orcamento_fotos(*)').eq('id', id).maybeSingle(),
      supabase.from('dados_pagamento').select('*').maybeSingle(),
    ]);
    const orc = r.data as Orcamento | null;
    if (orc?.itens) orc.itens.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    setO(orc);
    setPag((p.data as DadosPagamento) ?? null);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  if (!o || !prestador) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator color={cores.primaria} size="large" />
      </View>
    );
  }

  const marcaDagua = !planoAtivo(prestador);
  const pix = pixDoOrcamento(o, prestador, pag);

  async function mudarStatus(status: StatusOrcamento) {
    const { error } = await supabase.from('orcamentos').update({ status }).eq('id', id);
    if (error) Alert.alert('Ops', 'Não foi possível atualizar.');
    await carregar();
  }

  async function enviarWhatsApp() {
    setOcupado('zap');
    if (o!.status === 'rascunho') await mudarStatus('enviado');
    setOcupado(null);
    await abrirWhatsApp(mensagemWhatsApp(o!, prestador!), o!.cliente?.telefone);
  }

  async function gerarPdf() {
    setOcupado('pdf');
    try {
      await compartilharPdf(o!, prestador!, pag, marcaDagua);
    } catch {
      Alert.alert('Ops', 'Não foi possível gerar o PDF.');
    }
    setOcupado(null);
  }

  async function compartilharLink() {
    if (o!.status === 'rascunho') await mudarStatus('enviado');
    await Share.share({ message: mensagemWhatsApp(o!, prestador!) });
  }

  function excluir() {
    Alert.alert('Excluir orçamento?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('orcamentos').delete().eq('id', id);
          router.back();
        },
      },
    ]);
  }

  function maisOpcoes() {
    Alert.alert('Opções', undefined, [
      { text: 'Editar', onPress: () => router.push({ pathname: '/orcamento/editar', params: { id } }) },
      { text: 'Duplicar', onPress: () => router.push({ pathname: '/orcamento/editar', params: { duplicarDe: id } }) },
      ...(o!.status !== 'rascunho' ? [{ text: 'Voltar para rascunho', onPress: () => mudarStatus('rascunho') }] : []),
      { text: 'Excluir', style: 'destructive' as const, onPress: excluir },
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  }

  const servicos = (o.itens ?? []).filter((i) => i.tipo === 'servico');
  const materiais = (o.itens ?? []).filter((i) => i.tipo === 'material');

  const linhaTempo = [
    { feito: true, texto: 'Criado', quando: o.criado_em },
    { feito: !!o.enviado_em, texto: 'Enviado ao cliente', quando: o.enviado_em },
    { feito: !!o.visualizado_em, texto: 'Cliente abriu o link', quando: o.visualizado_em },
    {
      feito: !!o.respondido_em,
      texto: o.status === 'recusado' ? `Recusado por ${o.respondido_por}` : o.respondido_por ? `Aprovado por ${o.respondido_por}` : 'Aprovação do cliente',
      quando: o.respondido_em,
    },
  ];

  const Lista = ({ titulo, lista }: { titulo: string; lista: typeof servicos }) =>
    lista.length ? (
      <View style={{ gap: 10 }}>
        <Text style={[fonte.pequeno, { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }]}>{titulo}</Text>
        {lista.map((i, n) => (
          <View key={i.id ?? n} style={{ flexDirection: 'row', gap: espaco.s }}>
            <View style={{ flex: 1 }}>
              <Text style={[fonte.corpo, { color: cores.tinta, fontWeight: '600' }]}>{i.descricao}</Text>
              <Text style={fonte.pequeno}>
                {numeroBR(Number(i.quantidade))} {i.unidade} × {moeda(i.valor_unitario)}
              </Text>
            </View>
            <Text style={[fonte.corpo, { fontWeight: '700', color: cores.tinta }]}>{moeda(Number(i.quantidade) * Number(i.valor_unitario))}</Text>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: `Nº ${String(o.numero).padStart(4, '0')}`,
          headerRight: () => (
            <Pressable onPress={maisOpcoes} hitSlop={12} accessibilityLabel="Mais opções">
              <Ionicons name="ellipsis-horizontal-circle" size={26} color={cores.tinta} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: espaco.l, gap: espaco.m, paddingBottom: espaco.xxl }}>
        {recemCriado && o.status === 'rascunho' ? <Aviso tipo="sucesso" texto="Orçamento pronto! Agora é só mandar para o cliente." /> : null}

        <View style={{ gap: 6 }}>
          <Etiqueta status={o.status} />
          <Text style={[fonte.titulo, { fontSize: 24 }]}>{o.titulo}</Text>
          <Text style={fonte.pequeno}>
            {o.cliente?.nome ?? 'Sem cliente'} · {dataBR(o.criado_em)}
          </Text>
        </View>

        {/* Ações principais */}
        <View style={{ gap: espaco.s }}>
          <Pressable onPress={enviarWhatsApp} style={({ pressed }) => [s.zap, pressed && { opacity: 0.85 }]} accessibilityRole="button" disabled={!!ocupado}>
            {ocupado === 'zap' ? <ActivityIndicator color="#fff" /> : <Ionicons name="logo-whatsapp" size={24} color="#fff" />}
            <Text style={s.zapTexto}>{o.status === 'rascunho' ? 'Enviar pelo WhatsApp' : 'Reenviar pelo WhatsApp'}</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: espaco.s }}>
            <Botao titulo={ocupado === 'pdf' ? 'Gerando…' : 'PDF'} variante="secundario" onPress={gerarPdf} carregando={ocupado === 'pdf'} estilo={{ flex: 1, height: 48 }} />
            <Botao titulo="Compartilhar link" variante="secundario" onPress={compartilharLink} estilo={{ flex: 1.4, height: 48 }} />
          </View>
          {pix && !['pago', 'recusado'].includes(o.status) ? (
            <Botao titulo="Receber agora com QR Code Pix" variante="secundario" onPress={() => setQrAberto(true)} estilo={{ height: 48 }} />
          ) : null}
          {!pag ? (
            <Pressable onPress={() => router.push('/pagamento')}>
              <Text style={[fonte.pequeno, { color: cores.primariaEscura, fontWeight: '600' }]}>+ Cadastre sua chave Pix para o cliente pagar pelo QR Code</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Andamento */}
        {o.status === 'aprovado' ? (
          <Botao titulo="Marcar serviço como concluído" onPress={() => mudarStatus('concluido')} />
        ) : o.status === 'concluido' ? (
          <Botao titulo="Marcar como pago" onPress={() => mudarStatus('pago')} />
        ) : null}
        {o.status === 'recusado' && o.motivo_recusa ? <Aviso texto={`Motivo: ${o.motivo_recusa}`} /> : null}

        <Cartao estilo={{ gap: espaco.m }}>
          <Lista titulo="Serviços" lista={servicos} />
          <Lista titulo="Materiais" lista={materiais} />
          <View style={{ borderTopWidth: 1, borderTopColor: cores.borda, paddingTop: espaco.m, gap: 4 }}>
            {Number(o.desconto) > 0 ? (
              <>
                <View style={s.linha}>
                  <Text style={fonte.pequeno}>Subtotal</Text>
                  <Text style={fonte.pequeno}>{moeda(o.subtotal)}</Text>
                </View>
                <View style={s.linha}>
                  <Text style={fonte.pequeno}>Desconto</Text>
                  <Text style={fonte.pequeno}>− {moeda(o.desconto)}</Text>
                </View>
              </>
            ) : null}
            <View style={s.linha}>
              <Text style={[fonte.corpo, { fontWeight: '800', color: cores.tinta }]}>Total</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: cores.tinta }}>{moeda(o.total)}</Text>
            </View>
          </View>
        </Cartao>

        {o.prazo_execucao || o.forma_pagamento || o.observacoes ? (
          <Cartao estilo={{ gap: 6 }}>
            {o.prazo_execucao ? <Text style={fonte.corpo}>⏱️ Prazo: {o.prazo_execucao}</Text> : null}
            {o.forma_pagamento ? <Text style={fonte.corpo}>💳 Pagamento: {o.forma_pagamento}</Text> : null}
            {o.observacoes ? <Text style={fonte.corpo}>📝 {o.observacoes}</Text> : null}
            <Text style={fonte.pequeno}>Válido por {o.validade_dias} dias</Text>
          </Cartao>
        ) : null}

        {o.retorno_em ? (
          <Cartao estilo={{ flexDirection: 'row', alignItems: 'center', gap: espaco.m }}>
            <Ionicons name="alarm-outline" size={22} color={cores.primariaEscura} />
            <Text style={[fonte.corpo, { flex: 1 }]}>Lembrete de retorno em {dataBR(o.retorno_em)}</Text>
          </Cartao>
        ) : null}

        <Secao titulo="Fotos do serviço">
          <FotosServico orcamentoId={o.id} />
        </Secao>

        <Secao titulo="Acompanhamento">
          <Cartao estilo={{ gap: espaco.m }}>
            {linhaTempo.map((p) => (
              <View key={p.texto} style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.m }}>
                <Ionicons
                  name={p.feito ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={p.feito ? (o.status === 'recusado' && p.texto.startsWith('Recusado') ? cores.erro : cores.sucesso) : cores.borda}
                />
                <Text style={[fonte.corpo, { flex: 1, color: p.feito ? cores.tinta : cores.textoSuave }]}>{p.texto}</Text>
                {p.quando ? <Text style={fonte.pequeno}>{tempoRelativo(p.quando)}</Text> : null}
              </View>
            ))}
          </Cartao>
          {o.status !== 'rascunho' ? (
            <Text style={[fonte.pequeno, { marginTop: espaco.s }]} selectable>
              Link do cliente: {linkPublico(o.token_publico)}
            </Text>
          ) : null}
        </Secao>
      </ScrollView>

      <Modal visible={qrAberto} animationType="fade" transparent onRequestClose={() => setQrAberto(false)}>
        <Pressable style={s.qrFundo} onPress={() => setQrAberto(false)}>
          <View style={s.qrCaixa}>
            <Text style={[fonte.rotulo, { fontSize: 17, color: cores.tinta }]}>Mostre para o cliente pagar</Text>
            {pix ? <QRPix codigo={pix} tamanho={240} /> : null}
            <Text style={{ fontSize: 28, fontWeight: '900', color: cores.tinta }}>{moeda(o.total)}</Text>
            <Text style={[fonte.pequeno, { textAlign: 'center' }]}>O cliente abre o app do banco, escolhe Pix › Ler QR Code. O valor já vem preenchido.</Text>
            <Botao titulo="Cliente pagou" onPress={() => { setQrAberto(false); mudarStatus('pago'); }} estilo={{ alignSelf: 'stretch' }} />
            <Botao titulo="Fechar" variante="texto" onPress={() => setQrAberto(false)} />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  zap: {
    height: 58,
    borderRadius: raio.m,
    backgroundColor: '#15803D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.s,
  },
  zapTexto: { color: '#fff', fontSize: 18, fontWeight: '800' },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qrFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: espaco.l },
  qrCaixa: { backgroundColor: cores.superficie, borderRadius: raio.g, padding: espaco.l, alignItems: 'center', gap: espaco.m, width: '100%', maxWidth: 380 },
});
