import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Botao, Etiqueta } from '@/components/ui';
import { dataBR, moeda, numeroBR } from '@/lib/formato';
import { gerarPixCopiaECola } from '@/lib/pix';
import { OrcamentoPublico, supabase } from '@/lib/supabase';
import { mascaraDocumento, mascaraTelefone } from '@/lib/validacao';
import { cores, espaco, fonte, raio } from '@/theme';

/**
 * Página que o CLIENTE abre pelo link do WhatsApp. Sem login: lê pelo token.
 * Funciona no navegador (expo web) e no app.
 */
export default function OrcamentoDoCliente() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [o, setO] = useState<OrcamentoPublico | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'naoexiste'>('carregando');
  const [nome, setNome] = useState('');
  const [motivo, setMotivo] = useState('');
  const [recusando, setRecusando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function carregar() {
    if (!/^[0-9a-f-]{36}$/i.test(token ?? '')) return setEstado('naoexiste');
    const { data, error } = await supabase.rpc('orcamento_publico', { p_token: token });
    if (error || !data) return setEstado('naoexiste');
    setO(data as OrcamentoPublico);
    setNome((n) => n || (data as OrcamentoPublico).cliente?.nome || '');
    setEstado('ok');
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const pix = useMemo(() => {
    if (!o?.pix || Number(o.total) <= 0) return null;
    return gerarPixCopiaECola({
      chave: o.pix.chave,
      nome: o.pix.titular,
      cidade: o.prestador.cidade ?? 'BRASIL',
      valor: Number(o.total),
      txid: `FEITO${o.numero}`,
    });
  }, [o]);

  useEffect(() => {
    if (!pix) return;
    QRCode.toString(pix, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then((svg) =>
      setQrUri(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`),
    );
  }, [pix]);

  async function responder(aprovar: boolean) {
    setErro(null);
    if (nome.trim().length < 2) return setErro('Digite seu nome para confirmar.');
    setEnviando(true);
    const { error } = await supabase.rpc('responder_orcamento', {
      p_token: token,
      p_aprovar: aprovar,
      p_nome: nome.trim(),
      p_motivo: aprovar ? null : motivo.trim() || null,
    });
    setEnviando(false);
    if (error) return setErro(error.message || 'Não foi possível enviar. Tente de novo.');
    setRecusando(false);
    await carregar();
  }

  async function copiarPix() {
    if (!pix) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(pix);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } else {
      await Share.share({ message: pix });
    }
  }

  if (estado === 'carregando') {
    return (
      <View style={s.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  if (estado === 'naoexiste' || !o) {
    return (
      <View style={s.centro}>
        <Stack.Screen options={{ title: 'Orçamento' }} />
        <Ionicons name="document-outline" size={48} color={cores.textoSuave} />
        <Text style={[fonte.titulo, { fontSize: 22, marginTop: espaco.m }]}>Orçamento não encontrado</Text>
        <Text style={[fonte.subtitulo, { textAlign: 'center', marginTop: espaco.s }]}>O link pode estar incompleto. Peça um novo ao prestador.</Text>
      </View>
    );
  }

  const p = o.prestador;
  const servicos = o.itens.filter((i) => i.tipo === 'servico');
  const materiais = o.itens.filter((i) => i.tipo === 'material');
  const vencido = new Date(`${o.valido_ate}T23:59:59`) < new Date();
  const podeResponder = o.status === 'enviado' && !vencido;
  const aprovado = ['aprovado', 'concluido', 'pago'].includes(o.status);

  const Grupo = ({ titulo, lista }: { titulo: string; lista: typeof servicos }) =>
    lista.length ? (
      <View style={{ gap: 10 }}>
        <Text style={s.rotuloGrupo}>{titulo}</Text>
        {lista.map((i, n) => (
          <View key={n} style={{ flexDirection: 'row', gap: espaco.s }}>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <Stack.Screen options={{ title: `Orçamento ${o.numero} · ${p.nome_negocio || p.nome}` }} />
      <ScrollView contentContainerStyle={s.pagina}>
        {/* Prestador */}
        <View style={s.cabeca}>
          {p.logo_url ? (
            <Image source={{ uri: p.logo_url }} style={s.logo} />
          ) : (
            <View style={[s.logo, { backgroundColor: cores.tinta, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }}>{(p.nome_negocio || p.nome)[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[fonte.titulo, { fontSize: 20 }]}>{p.nome_negocio || p.nome}</Text>
            <Text style={fonte.pequeno}>
              {[p.nome_negocio ? p.nome : null, p.documento ? `${p.tipo_documento === 'cnpj' ? 'CNPJ' : 'CPF'} ${mascaraDocumento(p.documento)}` : null, [p.cidade, p.uf].filter(Boolean).join(' / ') || null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>

        <View style={s.cartao}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[fonte.pequeno, { flex: 1, fontWeight: '700' }]}>ORÇAMENTO Nº {String(o.numero).padStart(4, '0')}</Text>
            <Etiqueta status={o.status} />
          </View>
          <Text style={[fonte.titulo, { fontSize: 24 }]}>{o.titulo}</Text>
          {o.cliente?.nome ? <Text style={fonte.pequeno}>Para {o.cliente.nome}</Text> : null}
          {o.descricao ? <Text style={[fonte.corpo, { lineHeight: 23 }]}>{o.descricao}</Text> : null}
        </View>

        <View style={[s.cartao, { gap: espaco.m }]}>
          <Grupo titulo="Serviços" lista={servicos} />
          <Grupo titulo="Materiais" lista={materiais} />
          <View style={{ borderTopWidth: 1, borderTopColor: cores.borda, paddingTop: espaco.m, gap: 4 }}>
            {Number(o.desconto) > 0 ? (
              <View style={s.linha}>
                <Text style={fonte.pequeno}>Desconto</Text>
                <Text style={fonte.pequeno}>− {moeda(o.desconto)}</Text>
              </View>
            ) : null}
            <View style={s.linha}>
              <Text style={[fonte.corpo, { fontWeight: '800', color: cores.tinta }]}>Total</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: cores.tinta }}>{moeda(o.total)}</Text>
            </View>
          </View>
        </View>

        <View style={[s.cartao, { gap: 6 }]}>
          {o.prazo_execucao ? <Text style={fonte.corpo}>Prazo: {o.prazo_execucao}</Text> : null}
          {o.forma_pagamento ? <Text style={fonte.corpo}>Pagamento: {o.forma_pagamento}</Text> : null}
          {o.observacoes ? <Text style={fonte.corpo}>{o.observacoes}</Text> : null}
          <Text style={fonte.pequeno}>{vencido ? `Venceu em ${dataBR(o.valido_ate)}` : `Válido até ${dataBR(o.valido_ate)}`}</Text>
        </View>

        {/* Resposta */}
        {aprovado ? (
          <Aviso tipo="sucesso" texto={`Aprovado por ${o.respondido_por ?? 'você'}${o.respondido_em ? ` em ${dataBR(o.respondido_em)}` : ''}. Obrigado!`} />
        ) : o.status === 'recusado' ? (
          <Aviso texto="Você recusou este orçamento. Se mudar de ideia, fale com o prestador." />
        ) : vencido ? (
          <Aviso texto="Este orçamento venceu. Peça uma atualização ao prestador." />
        ) : null}

        {podeResponder ? (
          <View style={[s.cartao, { gap: espaco.m }]}>
            <Text style={[fonte.rotulo, { fontSize: 17, color: cores.tinta }]}>{recusando ? 'Recusar orçamento' : 'Tudo certo? Aprove aqui'}</Text>
            {erro ? <Aviso texto={erro} /> : null}
            <View>
              <Text style={[fonte.rotulo, { marginBottom: 6 }]}>Seu nome</Text>
              <TextInput value={nome} onChangeText={setNome} style={s.campo} autoCapitalize="words" placeholder="Nome completo" placeholderTextColor={cores.textoSuave} />
            </View>
            {recusando ? (
              <>
                <View>
                  <Text style={[fonte.rotulo, { marginBottom: 6 }]}>Motivo (opcional)</Text>
                  <TextInput value={motivo} onChangeText={setMotivo} style={s.campo} placeholder="Ex.: achei caro, vou adiar" placeholderTextColor={cores.textoSuave} />
                </View>
                <Botao titulo="Confirmar recusa" onPress={() => responder(false)} carregando={enviando} estilo={{ backgroundColor: cores.erro, shadowColor: cores.erro }} />
                <Botao titulo="Voltar" variante="texto" onPress={() => setRecusando(false)} />
              </>
            ) : (
              <>
                <Botao titulo="Aprovar orçamento" onPress={() => responder(true)} carregando={enviando} />
                <Botao titulo="Recusar" variante="texto" onPress={() => setRecusando(true)} />
              </>
            )}
          </View>
        ) : null}

        {/* Pix */}
        {pix && o.status !== 'pago' && o.status !== 'recusado' ? (
          <View style={[s.cartao, { alignItems: 'center', gap: espaco.m }]}>
            <Text style={[fonte.rotulo, { fontSize: 17, color: cores.tinta }]}>Pagar com Pix</Text>
            {qrUri ? <Image source={{ uri: qrUri }} style={{ width: 200, height: 200 }} accessibilityLabel="QR Code do Pix" /> : <ActivityIndicator color={cores.primaria} />}
            <Text style={[fonte.pequeno, { textAlign: 'center' }]}>
              {moeda(o.total)} para {o.pix?.titular}. Abra o app do banco e leia o QR Code, ou copie o código.
            </Text>
            <Botao titulo={copiado ? 'Código copiado ✓' : 'Copiar Pix Copia e Cola'} variante="secundario" onPress={copiarPix} estilo={{ alignSelf: 'stretch' }} />
          </View>
        ) : null}

        {p.telefone ? (
          <Pressable
            onPress={() => Linking.openURL(`https://wa.me/55${p.telefone}?text=${encodeURIComponent(`Olá! Sobre o orçamento nº ${o.numero} (${o.titulo})...`)}`)}
            style={s.falar}
            accessibilityRole="link"
          >
            <Ionicons name="logo-whatsapp" size={20} color="#15803D" />
            <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 16 }}>Falar com {p.nome.split(' ')[0]} · {mascaraTelefone(p.telefone)}</Text>
          </Pressable>
        ) : null}

        {p.marca_dagua ? <Text style={[fonte.pequeno, { textAlign: 'center', marginTop: espaco.m }]}>Orçamento feito com o app Feito! ✓</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.l, backgroundColor: cores.fundo },
  pagina: { padding: espaco.l, gap: espaco.m, width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: espaco.xxl },
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, marginVertical: espaco.s },
  logo: { width: 56, height: 56, borderRadius: 16 },
  cartao: { backgroundColor: cores.superficie, borderRadius: raio.m, padding: espaco.l, gap: espaco.s },
  rotuloGrupo: { fontSize: 12, fontWeight: '700', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 0.6 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  campo: { height: 52, borderRadius: raio.m, borderWidth: 1.5, borderColor: cores.borda, paddingHorizontal: espaco.m, fontSize: 17, color: cores.tinta, backgroundColor: cores.superficie },
  falar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaco.s, padding: espaco.m, borderRadius: raio.m, backgroundColor: '#E8F7EE' },
});
