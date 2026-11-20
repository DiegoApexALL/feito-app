import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Secao } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { dataBR } from '@/lib/formato';
import { planoAtivo } from '@/lib/supabase';
import { cores, espaco, fonte, raio } from '@/theme';

function Item({ icone, titulo, sub, onPress, perigo }: { icone: keyof typeof Ionicons.glyphMap; titulo: string; sub?: string; onPress: () => void; perigo?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <Ionicons name={icone} size={22} color={perigo ? cores.erro : cores.primariaEscura} />
      <View style={{ flex: 1 }}>
        <Text style={[fonte.corpo, { fontWeight: '600', color: perigo ? cores.erro : cores.tinta }]}>{titulo}</Text>
        {sub ? <Text style={fonte.pequeno}>{sub}</Text> : null}
      </View>
      {!perigo ? <Ionicons name="chevron-forward" size={18} color={cores.textoSuave} /> : null}
    </Pressable>
  );
}

export default function Conta() {
  const { prestador, sessao, sair } = useAuth();
  const pro = planoAtivo(prestador);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: espaco.l }}>
        <View style={s.cabeca}>
          {prestador?.logo_url ? (
            <Image source={{ uri: prestador.logo_url }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, { backgroundColor: cores.tinta, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 24 }}>{prestador?.nome[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[fonte.titulo, { fontSize: 22 }]}>{prestador?.nome_negocio || prestador?.nome}</Text>
            <Text style={fonte.pequeno}>{sessao?.user.email}</Text>
          </View>
        </View>

        <Pressable onPress={() => router.push('/planos')} style={[s.plano, pro && { backgroundColor: cores.tinta }]} accessibilityRole="button">
          <Ionicons name={pro ? 'star' : 'rocket'} size={24} color={pro ? '#FDBA74' : cores.primariaEscura} />
          <View style={{ flex: 1 }}>
            <Text style={[fonte.corpo, { fontWeight: '800', color: pro ? '#fff' : cores.tinta }]}>{pro ? 'Feito! Pro' : 'Plano grátis'}</Text>
            <Text style={[fonte.pequeno, pro && { color: '#D6D3D1' }]}>
              {pro ? (prestador?.plano_ate ? `Ativo até ${dataBR(prestador.plano_ate)}` : 'Ativo') : '5 orçamentos/mês · toque para ver o Pro'}
            </Text>
          </View>
        </Pressable>

        <Secao titulo="Meu negócio">
          <View style={{ gap: espaco.s }}>
            <Item icone="construct-outline" titulo="Perfil e logo" sub="Aparece no cabeçalho do orçamento" onPress={() => router.push('/perfil')} />
            <Item icone="pricetags-outline" titulo="Meus preços" sub="Serviços e materiais salvos dos orçamentos" onPress={() => router.push('/catalogo')} />
            <Item icone="qr-code-outline" titulo="Recebimento via Pix" sub="Vai no orçamento com QR Code" onPress={() => router.push('/pagamento')} />
          </View>
        </Secao>

        <Secao titulo="Ajuda">
          <View style={{ gap: espaco.s }}>
            <Item
              icone="bulb-outline"
              titulo="Dica: fale em vez de digitar"
              sub="Toque no microfone do teclado ao descrever o serviço"
              onPress={() =>
                Alert.alert(
                  'Fale o serviço',
                  'Na tela do orçamento, toque no microfone do teclado e fale do seu jeito, por exemplo:\n\n"Troquei 3 tomadas a 50 cada, 10 metros de fio por 45 e mão de obra 200"\n\nDepois toque em "Montar itens" e confira.',
                )
              }
            />
          </View>
        </Secao>

        <Item icone="log-out-outline" titulo="Sair da conta" perigo onPress={sair} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, marginBottom: espaco.l, marginTop: espaco.s },
  avatar: { width: 64, height: 64, borderRadius: 20 },
  plano: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, backgroundColor: cores.primariaSuave, borderRadius: raio.m, padding: espaco.m, marginBottom: espaco.l },
  item: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, backgroundColor: cores.superficie, padding: espaco.m, borderRadius: raio.m },
});
