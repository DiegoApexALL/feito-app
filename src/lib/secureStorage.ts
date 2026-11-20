import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Guarda a sessão do usuário no cofre do aparelho (Keychain no iPhone,
 * Keystore no Android). O SecureStore aceita no máximo ~2 KB por chave,
 * então a sessão é dividida em pedaços.
 */
const TAMANHO_PEDACO = 1800;

const chaveSegura = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, '_');

async function getItem(key: string): Promise<string | null> {
  const k = chaveSegura(key);
  const total = await SecureStore.getItemAsync(`${k}__n`);
  if (!total) return null;
  const partes: string[] = [];
  for (let i = 0; i < Number(total); i++) {
    const p = await SecureStore.getItemAsync(`${k}__${i}`);
    if (p == null) return null;
    partes.push(p);
  }
  return partes.join('');
}

async function removeItem(key: string): Promise<void> {
  const k = chaveSegura(key);
  const total = Number((await SecureStore.getItemAsync(`${k}__n`)) ?? 0);
  for (let i = 0; i < total; i++) await SecureStore.deleteItemAsync(`${k}__${i}`);
  await SecureStore.deleteItemAsync(`${k}__n`);
}

async function setItem(key: string, value: string): Promise<void> {
  await removeItem(key);
  const k = chaveSegura(key);
  const n = Math.ceil(value.length / TAMANHO_PEDACO);
  for (let i = 0; i < n; i++) {
    await SecureStore.setItemAsync(
      `${k}__${i}`,
      value.slice(i * TAMANHO_PEDACO, (i + 1) * TAMANHO_PEDACO),
      { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY },
    );
  }
  await SecureStore.setItemAsync(`${k}__n`, String(n));
}

// No navegador (expo web) não existe SecureStore: usa localStorage só para testes.
const webStorage = {
  getItem: async (k: string) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(k)),
  setItem: async (k: string, v: string) => localStorage.setItem(k, v),
  removeItem: async (k: string) => localStorage.removeItem(k),
};

export const secureStorage = Platform.OS === 'web' ? webStorage : { getItem, setItem, removeItem };
