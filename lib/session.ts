import * as SecureStore from 'expo-secure-store';

import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';

const KEYS = Object.values(AUTH_STORAGE_KEYS);

/** Svuota la sessione salvata (logout da drawer o da schermata Home). */
export async function clearSession(): Promise<void> {
  for (const key of KEYS) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* best-effort */
    }
  }
}
