import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from '@/components/ui';
import { cores, espaco, fonte, raio } from '@/theme';

const BENEFICIOS = [
  { icone: '🎙️', texto: 'Fale o serviço, o app monta o orçamento' },
  { icone: '📲', texto: 'Envie bonito pelo WhatsApp ou PDF' },
  { icone: '🗂️', texto: 'Tudo guardado, cliente por cliente' },
];

export default function BoasVindas() {
  return (
    <SafeAreaView style={s.tela}>
      <View style={s.topo}>
        <View style={s.logo}>
          <Text style={s.logoCheck}>✓</Text>
        </View>
        <Text style={s.marca}>Feito!</Text>
        <Text style={[fonte.subtitulo, s.slogan]}>Orçamento profissional em 1 minuto. Do jeito que o cliente gosta de receber.</Text>
      </View>

      <View style={{ gap: espaco.s }}>
        {BENEFICIOS.map((b) => (
          <View key={b.texto} style={s.beneficio}>
            <Text style={{ fontSize: 22 }}>{b.icone}</Text>
            <Text style={[fonte.corpo, { flex: 1, fontWeight: '500' }]}>{b.texto}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: espaco.s }}>
        <Botao titulo="Criar minha conta grátis" onPress={() => router.push('/criar-conta')} />
        <Botao titulo="Já tenho conta" variante="secundario" onPress={() => router.push('/entrar')} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, padding: espaco.l, justifyContent: 'space-between' },
  topo: { alignItems: 'center', marginTop: espaco.xxl },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    shadowColor: cores.primaria,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  logoCheck: { color: '#fff', fontSize: 48, fontWeight: '900' },
  marca: { fontSize: 44, fontWeight: '900', color: cores.tinta, marginTop: espaco.l, letterSpacing: -1 },
  slogan: { textAlign: 'center', marginTop: espaco.s, maxWidth: 300 },
  beneficio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.m,
    backgroundColor: cores.superficie,
    padding: espaco.m,
    borderRadius: raio.m,
  },
});
