/**
 * Base URL del backend Scaramuzzo Manager — unica sorgente per tutte le chiamate API.
 *
 * Configurazione: variabile d’ambiente `EXPO_PUBLIC_API_BASE_URL` (vedi `.env.example`).
 * Expo inietta le variabili `EXPO_PUBLIC_*` al build / avvio Metro.
 */

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (raw) {
    return normalizeBaseUrl(raw);
  }

  if (__DEV__) {
    console.warn(
      '[Scaramuzzo Team] EXPO_PUBLIC_API_BASE_URL non è impostato. ' +
        'Crea un file .env nella root (copia da .env.example). ' +
        'Fallback dev: http://127.0.0.1:3000'
    );
    return 'http://127.0.0.1:3000';
  }

  throw new Error(
    '[Scaramuzzo Team] EXPO_PUBLIC_API_BASE_URL non configurato. ' +
      'Imposta la variabile per le build di produzione (EAS Secrets / env di build).'
  );
}

export const API_BASE_URL = resolveApiBaseUrl();
