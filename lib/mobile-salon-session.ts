import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';
import * as SecureStorage from '@/lib/secure-storage';
import {
  parsePositiveSalonId,
  parseSalonIdsFromLoginPayload,
  parseSalonIdsJson,
  primarySalonIdFromLoginPayload,
} from '@/lib/mobile-salon-parse';

export {
  parseSalonIdsFromLoginPayload,
  parseSalonIdsJson,
  primarySalonIdFromLoginPayload,
} from '@/lib/mobile-salon-parse';

export async function persistLoginSalonSession(payload: Record<string, unknown>): Promise<void> {
  const salonIds = parseSalonIdsFromLoginPayload(payload);
  const primary = primarySalonIdFromLoginPayload(payload, salonIds);

  if (primary !== null) {
    await SecureStorage.setItemAsync(AUTH_STORAGE_KEYS.salonId, String(primary));
    await SecureStorage.setItemAsync(AUTH_STORAGE_KEYS.currentMobileSalonId, String(primary));
  } else {
    await SecureStorage.deleteItemAsync(AUTH_STORAGE_KEYS.salonId).catch(() => {});
    await SecureStorage.deleteItemAsync(AUTH_STORAGE_KEYS.currentMobileSalonId).catch(() => {});
  }

  await SecureStorage.setItemAsync(AUTH_STORAGE_KEYS.salonIdsJson, JSON.stringify(salonIds));
}

export async function readSalonIdsOrNull(): Promise<number[]> {
  try {
    const raw = await SecureStorage.getItemAsync(AUTH_STORAGE_KEYS.salonIdsJson);
    const ids = parseSalonIdsJson(raw);
    if (ids.length > 0) {
      return ids;
    }
    const primary = await SecureStorage.getItemAsync(AUTH_STORAGE_KEYS.salonId);
    const n = parsePositiveSalonId(primary);
    return n !== null ? [n] : [];
  } catch {
    return [];
  }
}

export async function hasMultipleSalons(): Promise<boolean> {
  const ids = await readSalonIdsOrNull();
  return ids.length > 1;
}

/** Salone usato per le API mobile (override o primario da login). */
export async function getCurrentMobileSalonId(): Promise<number | null> {
  try {
    const currentRaw = await SecureStorage.getItemAsync(AUTH_STORAGE_KEYS.currentMobileSalonId);
    const current = parsePositiveSalonId(currentRaw);
    if (current !== null) {
      return current;
    }

    const primaryRaw = await SecureStorage.getItemAsync(AUTH_STORAGE_KEYS.salonId);
    return parsePositiveSalonId(primaryRaw);
  } catch {
    return null;
  }
}

export async function setCurrentMobileSalonId(salonId: number): Promise<void> {
  const n = parsePositiveSalonId(salonId);
  if (n === null) {
    throw new Error('salon_id non valido');
  }
  await SecureStorage.setItemAsync(AUTH_STORAGE_KEYS.currentMobileSalonId, String(n));
}

/** Aggiunge `salon_id` corrente al body POST mobile quando disponibile. */
export async function withCurrentSalonId(
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const salonId = await getCurrentMobileSalonId();
  if (salonId === null) {
    return body;
  }
  return { ...body, salon_id: salonId };
}
