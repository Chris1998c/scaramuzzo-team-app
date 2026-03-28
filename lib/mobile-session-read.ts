import * as SecureStore from 'expo-secure-store';

import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';

/**
 * Legge `staff_id` dalla sessione locale.
 * Usato dalle schermate dopo il guard del drawer; mantiene un solo parsing numerico.
 */
export async function readStaffIdOrNull(): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.staffId);
    if (!raw?.trim()) {
      return null;
    }
    const n = Number(raw.trim());
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return n;
  } catch {
    return null;
  }
}
