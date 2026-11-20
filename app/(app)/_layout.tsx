import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { cores } from '@/theme';

export default function AppLayout() {
  const { prestador, precisaNovaSenha } = useAuth();

  if (!prestador) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo }}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  const completo = prestador.cadastro_completo;

  return (
    <Stack
      screenOptions={{
        headerTitle: '',
        headerShadowVisible: false,
        headerTintColor: cores.tinta,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: cores.fundo },
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      {/* Entrou por recuperação de senha: só a tela de nova senha */}
      <Stack.Protected guard={precisaNovaSenha}>
        <Stack.Screen name="nova-senha" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!precisaNovaSenha}>
        {/* Cadastro completo libera o início; senão o app abre no passo 1 */}
        <Stack.Protected guard={completo}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="perfil" options={{ headerShown: completo }} />
        <Stack.Screen name="pagamento" />
      </Stack.Protected>
    </Stack>
  );
}
