import { readMobileErrorPayload } from '@/lib/mobile-error-payload';

export type ClockAttendanceErrorKind = 'geofence' | 'location' | 'generic';

export type ClockAttendanceErrorUx = {
  kind: ClockAttendanceErrorKind;
  title: string;
  subtitle?: string;
};

function combinedMessage(httpStatus: number | undefined, payload: unknown): string {
  const fromPayload = readMobileErrorPayload(payload);
  const parts = [fromPayload, httpStatus != null ? String(httpStatus) : ''].filter(Boolean);
  return parts.join(' ').toLowerCase();
}

function errorCodeFromPayload(payload: unknown): string | null {
  if (payload == null || typeof payload !== 'object') {
    return null;
  }
  const o = payload as Record<string, unknown>;
  const code = o.code ?? o.error_code;
  if (typeof code === 'string' && code.trim()) {
    return code.trim().toLowerCase();
  }
  return null;
}

/**
 * UX timbratura: mock GPS, accuratezza, geofence (Manager hardened).
 */
export function mapClockAttendanceErrorUx(
  httpStatus: number | undefined,
  payload: unknown,
  fallbackMessage?: string
): ClockAttendanceErrorUx {
  const text = combinedMessage(httpStatus, payload);
  const code = errorCodeFromPayload(payload);
  const apiMessage = readMobileErrorPayload(payload) ?? fallbackMessage?.trim() ?? '';

  const isMock =
    code?.includes('mock') === true ||
    text.includes('mock') ||
    text.includes('simulat') ||
    text.includes('fake location') ||
    text.includes('posizione simulata');

  if (isMock) {
    return {
      kind: 'location',
      title: 'Posizione non valida',
      subtitle: 'Disattiva la posizione simulata nelle impostazioni del telefono e riprova.',
    };
  }

  const isAccuracy =
    code?.includes('accuracy') === true ||
    text.includes('accuracy') ||
    text.includes('accuratezza') ||
    text.includes('precisione') ||
    text.includes('100m') ||
    text.includes('100 m');

  if (isAccuracy) {
    return {
      kind: 'location',
      title: 'Posizione non valida',
      subtitle: 'Attendi un segnale GPS più preciso, poi riprova la timbratura.',
    };
  }

  const isGeofence =
    httpStatus === 403 ||
    code?.includes('geofence') === true ||
    text.includes('geofence') ||
    text.includes('fuori sede') ||
    text.includes('lontan') ||
    text.includes('salone') ||
    text.includes('sede');

  if (isGeofence) {
    return {
      kind: 'geofence',
      title: apiMessage || 'Sei fuori dalla sede',
      subtitle: 'Avvicinati al salone per timbrare.',
    };
  }

  return {
    kind: 'generic',
    title: apiMessage || fallbackMessage?.trim() || 'Impossibile registrare la timbratura.',
  };
}
