import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { cores } from '@/theme';

type Icone = keyof typeof Ionicons.glyphMap;

const icone =
  (nome: Icone, ativo: Icone) =>
  ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
    <Ionicons name={focused ? ativo : nome} color={color} size={size} />
  );

export default function AbasLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.primariaEscura,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.borda, height: 64, paddingTop: 6 },
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
