import { Stack } from 'expo-router';
import { cores } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerTintColor: cores.tinta,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: cores.fundo },
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
