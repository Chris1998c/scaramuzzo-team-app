import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';
import * as SecureStorage from '@/lib/secure-storage';

function generateStableDeviceId(): string {
  const part = () => Math.random().toString(36).slice(2, 10);
  return `team-${Date.now().toString(36)}-${part()}${part()}`;
}

/** Identificativo dispositivo stabile per audit timbrature (store sessione/native). */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await SecureStorage.getItemAsync(AUTH_STORAGE_KEYS.deviceId);
    const trimmed = existing?.trim();
    if (trimmed) {
      return trimmed;
    }
  } catch {
    /* genera nuovo */
  }

  const id = generateStableDeviceId();
  await SecureStorage.setItemAsync(AUTH_STORAGE_KEYS.deviceId, id);
  return id;
}
