import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';
import * as SecureStorage from '@/lib/secure-storage';

const KEYS = Object.values(AUTH_STORAGE_KEYS);

/** Svuota la sessione salvata (logout da drawer o da schermata Home). */
export async function clearSession(): Promise<void> {
  for (const key of KEYS) {
    try {
      await SecureStorage.deleteItemAsync(key);
    } catch {
      /* best-effort */
    }
  }
}
