import { router } from 'expo-router';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { cores, espaco, fonte, raio } from '@/theme';

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function Item({ icone, titulo, onPress }: { icone: string; titulo: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <Text style={{ fontSize: 22 }}>{icone}</Text>
      <Text style={[fonte.corpo, { flex: 1, fontWeight: '600' }]}>{titulo}</Text>
      <Text style={{ color: cores.textoSuave, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

export default function Inicio() {
  const { prestador, sair } = useAuth();
  const primeiroNome = prestador?.nome.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={s.tela}>
      <View style={s.topo}>
        <View style={{ flex: 1 }}>
          <Text style={fonte.pequeno}>{saudacao()},</Text>
          <Text style={[fonte.titulo, { fontSize: 26 }]}>{primeiroNome} 👷</Text>
        </View>
        <Pressable onPress={() => router.push('/perfil')} accessibilityLabel="Meu perfil">
          {prestador?.logo_url ? (
            <Image source={{ uri: prestador.logo_url }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarVazio]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{primeiroNome[0]}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [s.cta, pressed && { transform: [{ scale: 0.98 }] }]}
        onPress={() => Alert.alert('Em breve', 'A criação de orçamentos é a próxima etapa que vamos construir!')}
      >
        <Text style={{ fontSize: 34 }}>🎙️</Text>
        <Text style={s.ctaTitulo}>Novo orçamento</Text>
        <Text style={s.ctaSub}>Fale ou digite o serviço. A gente monta o resto.</Text>
      </Pressable>

      <View style={s.resumo}>
        {[
          { n: '0', r: 'Orçamentos' },
          { n: '0', r: 'Aprovados' },
          { n: 'R$ 0', r: 'No mês' },
        ].map((x) => (
          <View key={x.r} style={s.resumoItem}>
            <Text style={s.resumoNum}>{x.n}</Text>
            <Text style={fonte.pequeno}>{x.r}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: espaco.s }}>
        <Item icone="🧰" titulo="Meu perfil e negócio" onPress={() => router.push('/perfil')} />
        <Item icone="💸" titulo="Recebimento via Pix" onPress={() => router.push('/pagamento')} />
        <Item icone="🚪" titulo="Sair" onPress={sair} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, padding: espaco.l, gap: espaco.l },
  topo: { flexDirection: 'row', alignItems: 'center', marginTop: espaco.m },
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
  ctaTitulo: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: espaco.s },
  ctaSub: { color: 'rgba(255,255,255,0.9)', fontSize: 15 },
  resumo: { flexDirection: 'row', gap: espaco.s },
  resumoItem: { flex: 1, backgroundColor: cores.superficie, borderRadius: raio.m, padding: espaco.m, gap: 2 },
  resumoNum: { fontSize: 20, fontWeight: '800', color: cores.tinta },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.m,
    backgroundColor: cores.superficie,
    padding: espaco.m,
    borderRadius: raio.m,
  },
});
