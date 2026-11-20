import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartaoOrcamento } from '@/components/CartaoOrcamento';
import { Botao, Secao, Vazio } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { moeda } from '@/lib/formato';
import { Orcamento, planoAtivo, supabase } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

type Resumo = { orcamentos: number; aprovados: number; faturado: number; recebido: number };

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Inicio() {
  const { prestador } = useAuth();
  const [resumo, setResumo] = useState<Resumo>({ orcamentos: 0, aprovados: 0, faturado: 0, recebido: 0 });
  const [recentes, setRecentes] = useState<Orcamento[]>([]);
  const [atualizando, setAtualizando] = useState(false);
  const primeiroNome = prestador?.nome.split(' ')[0] ?? '';
  const pro = planoAtivo(prestador);

  const carregar = useCallback(async () => {
    const [r, l] = await Promise.all([
      supabase.rpc('resumo_mes'),
      supabase.from('orcamentos').select('*, cliente:clientes(id, nome, telefone, endereco)').order('criado_em', { ascending: false }).limit(5),
    ]);
    if (r.data) setResumo(r.data as Resumo);
    if (l.data) setRecentes(l.data as Orcamento[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const novo = () => router.push('/orcamento/editar');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: espaco.l, gap: espaco.l }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            tintColor={cores.primaria}
            onRefresh={async () => {
              setAtualizando(true);
              await carregar();
              setAtualizando(false);
            }}
          />
        }
      >
        <View style={s.topo}>
          <View style={{ flex: 1 }}>
            <Text style={fonte.pequeno}>{saudacao()},</Text>
            <Text style={[fonte.titulo, { fontSize: 26 }]}>{primeiroNome}</Text>
          </View>
          <Pressable onPress={() => router.push('/conta')} accessibilityLabel="Minha conta">
            {prestador?.logo_url ? (
              <Image source={{ uri: prestador.logo_url }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarVazio]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{primeiroNome[0]}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Pressable style={({ pressed }) => [s.cta, pressed && { transform: [{ scale: 0.98 }] }]} onPress={novo} accessibilityRole="button">
          <View style={s.ctaIcone}>
            <Ionicons name="mic" size={28} color="#fff" />
          </View>
          <Text style={s.ctaTitulo}>Novo orçamento</Text>
          <Text style={s.ctaSub}>Fale ou digite o serviço. A gente monta o resto.</Text>
        </Pressable>

        {!pro ? (
          <Pressable onPress={() => router.push('/planos')} style={s.plano} accessibilityRole="button">
            <Text style={[fonte.pequeno, { flex: 1, color: cores.texto }]}>
              Plano grátis: <Text style={{ fontWeight: '800' }}>{Math.min(resumo.orcamentos, 5)} de 5</Text> orçamentos este mês
            </Text>
            <Text style={{ color: cores.primariaEscura, fontWeight: '700' }}>Virar Pro</Text>
          </Pressable>
        ) : null}

        <View style={s.resumo}>
          {[
            { n: String(resumo.orcamentos), r: 'Orçamentos' },
            { n: String(resumo.aprovados), r: 'Aprovados' },
            { n: moeda(resumo.faturado).replace(',00', ''), r: 'Fechado no mês' },
          ].map((x) => (
            <View key={x.r} style={s.resumoItem}>
              <Text style={s.resumoNum} numberOfLines={1} adjustsFontSizeToFit>
                {x.n}
              </Text>
              <Text style={fonte.pequeno}>{x.r}</Text>
            </View>
          ))}
        </View>

        <Secao
          titulo="Últimos orçamentos"
          direita={
            recentes.length ? (
              <Pressable onPress={() => router.push('/orcamentos')} hitSlop={10}>
                <Text style={{ color: cores.primariaEscura, fontWeight: '700' }}>Ver todos</Text>
              </Pressable>
            ) : null
          }
        >
          {recentes.length ? (
            <View style={{ gap: espaco.s }}>
              {recentes.map((o) => (
                <CartaoOrcamento key={o.id} o={o} />
              ))}
            </View>
          ) : (
            <Vazio
              titulo="Seu primeiro orçamento"
              texto="Descreva o serviço do jeito que você fala. Em 1 minuto ele está pronto para mandar no WhatsApp."
              acao={<Botao titulo="Criar agora" onPress={novo} />}
            />
          )}
        </Secao>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', marginTop: espaco.s },
  avatar: { width: 48, height: 48, borderRadius: 16 },
  avatarVazio: { backgroundColor: cores.tinta, alignItems: 'center', justifyContent: 'center' },
  cta: {
    backgroundColor: cores.primaria,
    borderRadius: raio.g,
    padding: espaco.l,
    gap: 6,
    shadowColor: cores.primaria,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  ctaIcone: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  ctaTitulo: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: espaco.s },
  ctaSub: { color: '#fff', fontSize: 15 },
  plano: { flexDirection: 'row', alignItems: 'center', gap: espaco.s, backgroundColor: cores.primariaSuave, borderRadius: raio.m, padding: espaco.m },
  resumo: { flexDirection: 'row', gap: espaco.s },
  resumoItem: { flex: 1, backgroundColor: cores.superficie, borderRadius: raio.m, padding: espaco.m, gap: 2 },
  resumoNum: { fontSize: 20, fontWeight: '800', color: cores.tinta },
});
