import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Etiqueta } from '@/components/ui';
import { moeda, tempoRelativo } from '@/lib/formato';
import type { Orcamento } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

export function CartaoOrcamento({ o }: { o: Orcamento }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/orcamento/[id]', params: { id: o.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [
        { backgroundColor: cores.superficie, borderRadius: raio.m, padding: espaco.m, gap: 6 },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaco.s }}>
        <Text style={[fonte.pequeno, { fontWeight: '700' }]}>Nº {String(o.numero).padStart(4, '0')}</Text>
        <View style={{ flex: 1 }} />
        <Etiqueta status={o.status} />
      </View>
      <Text style={[fonte.corpo, { fontWeight: '700', color: cores.tinta }]} numberOfLines={1}>
        {o.titulo}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[fonte.pequeno, { flex: 1 }]} numberOfLines={1}>
          {o.cliente?.nome ?? 'Sem cliente'} · {tempoRelativo(o.criado_em)}
          {o.status === 'enviado' && o.visualizado_em ? ' · 👀 visto' : ''}
        </Text>
        <Text style={{ fontSize: 17, fontWeight: '800', color: cores.tinta }}>{moeda(o.total)}</Text>
      </View>
    </Pressable>
  );
}
