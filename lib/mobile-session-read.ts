import * as SecureStore from 'expo-secure-store';

import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';
import { clearSession } from '@/lib/session';

/**
 * Legge `staff_id` dalla sessione locale.
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

/** Bearer JWT emesso da POST /api/mobile/login (obbligatorio per le API mobile protette). */
export async function readAccessTokenOrNull(): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.accessToken);
    const t = raw?.trim();
    return t ? t : null;
  } catch {
    return null;
  }
}

export type ValidMobileSession = {
  staffId: number;
};

/**
 * Sessione completa: `staff_id` + `access_token` (allineato a Manager Bearer su /api/mobile/*).
 */
export async function hasValidMobileSession(): Promise<ValidMobileSession | null> {
  const staffId = await readStaffIdOrNull();
  const token = await readAccessTokenOrNull();
  if (staffId === null || token === null) {
    return null;
  }
  return { staffId };
}

/**
 * Per gate (index, login, drawer): se manca token o staff, oppure stato parziale,
 * svuota SecureStore e restituisce null → redirect login.
 */
export async function requireValidMobileSession(): Promise<ValidMobileSession | null> {
  const staffId = await readStaffIdOrNull();
  const token = await readAccessTokenOrNull();

  if (staffId === null && token === null) {
    return null;
  }

  if (staffId === null || token === null) {
    await clearSession();
    return null;
  }

  return { staffId };
}
