import * as SecureStore from 'expo-secure-store';

import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';

function generateStableDeviceId(): string {
  const part = () => Math.random().toString(36).slice(2, 10);
  return `team-${Date.now().toString(36)}-${part()}${part()}`;
}

/** Identificativo dispositivo stabile per audit timbrature (SecureStore). */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.deviceId);
    const trimmed = existing?.trim();
    if (trimmed) {
      return trimmed;
    }
  } catch {
    /* genera nuovo */
  }

  const id = generateStableDeviceId();
  await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.deviceId, id);
  return id;
}
