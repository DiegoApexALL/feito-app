import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores } from '@/theme';

type Icone = keyof typeof Ionicons.glyphMap;

const icone =
  (nome: Icone, ativo: Icone) =>
  ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? ativo : nome} color={color} size={size} />
  );

export default function AbasLayout() {
  // respeita a barra de navegação do celular (botões/gestos do Android)
  const { bottom } = useSafeAreaInsets();
  const folga = Math.max(bottom, 10);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.primariaEscura,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.borda, height: 60 + folga, paddingTop: 6, paddingBottom: folga },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icone('home-outline', 'home') }} />
      <Tabs.Screen name="orcamentos" options={{ title: 'Orçamentos', tabBarIcon: icone('document-text-outline', 'document-text') }} />
      <Tabs.Screen name="clientes" options={{ title: 'Clientes', tabBarIcon: icone('people-outline', 'people') }} />
      <Tabs.Screen name="conta" options={{ title: 'Conta', tabBarIcon: icone('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
