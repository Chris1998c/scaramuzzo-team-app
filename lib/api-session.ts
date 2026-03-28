import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';
import { API_BASE_URL } from '@/constants/api';
import { clearSession } from '@/lib/session';

/**
 * Client HTTP mobile post-login (`postMobileJson`).
 * Contratto: Bearer-first — se `access_token` è in SecureStore → `Authorization: Bearer …`.
 * Il body continua a includere `staff_id` dove già previsto (compat Manager senza token).
 * Login resta su `fetch` diretto a `/api/mobile/login` (nessun Bearer, 401 senza clearSession globale).
 */

async function headersForMobilePost(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.accessToken);
    if (token?.trim()) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }
  } catch {
    /* best-effort */
  }
  return headers;
}

/**
 * Solo 401 = sessione non valida → logout.
 * 403 (e altri non-401) = errore di business / permessi; mai clearSession qui.
 */
export function isSessionInvalidStatus(status: number): boolean {
  return status === 401;
}

/**
 * Se la risposta indica accesso negato / sessione non valida:
 * svuota SecureStore e torna al login.
 * @returns true se è stato eseguito il logout (non consumare il body per altre logiche).
 */
export async function logoutIfUnauthorized(response: Response): Promise<boolean> {
  if (!isSessionInvalidStatus(response.status)) {
    return false;
  }
  await clearSession();
  router.replace('/login');
  return true;
}

type PostJsonResult<T> =
  | { kind: 'unauthorized' }
  | { kind: 'success'; data: T }
  | { kind: 'error'; status: number; data: unknown | null };

/** Messaggio errore da body JSON Manager (`error` o `message`). */
export function readMobileErrorPayload(payload: unknown): string | null {
  if (payload == null || typeof payload !== 'object') {
    return null;
  }
  const o = payload as Record<string, unknown>;
  if (typeof o.error === 'string' && o.error.trim()) {
    return o.error.trim();
  }
  if (typeof o.message === 'string' && o.message.trim()) {
    return o.message.trim();
  }
  return null;
}

/**
 * POST JSON verso API mobile autenticate (dopo login).
 * Non usare per /api/mobile/login (credenziali errate = 401 senza invalidare sessione salvata).
 *
 * Su 403: `{ kind: 'error', status: 403, data }` — nessun logout; il caller mostra l’errore.
 */
export async function postMobileJson<T = unknown>(
  path: string,
  body: object
): Promise<PostJsonResult<T>> {
  const headers = await headersForMobilePost();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (await logoutIfUnauthorized(response)) {
    return { kind: 'unauthorized' };
  }

  let parsed: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = null;
    }
  }

  if (response.ok) {
    return { kind: 'success', data: parsed as T };
  }
  return { kind: 'error', status: response.status, data: parsed };
}
