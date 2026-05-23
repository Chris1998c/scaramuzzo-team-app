import type { ClockAttendanceErrorUx } from '@/lib/attendance-clock-errors';
import type { ClockAttendanceResult } from '@/lib/mobile-attendance';

export type ClockAttendanceUiErrors = {
  gpsError: string | null;
  gpsSubtitle: string | null;
  distanceError: string | null;
  distanceSubtitle: string | null;
  clockError: string | null;
};

export function emptyClockAttendanceUiErrors(): ClockAttendanceUiErrors {
  return {
    gpsError: null,
    gpsSubtitle: null,
    distanceError: null,
    distanceSubtitle: null,
    clockError: null,
  };
}

/** Applica `errorUx` da timbratura fallita agli state della UI (home / presenze). */
export function clockAttendanceUiErrorsFromResult(
  result: Extract<ClockAttendanceResult, { ok: false }>
): ClockAttendanceUiErrors {
  const empty = emptyClockAttendanceUiErrors();
  if (!result.errorUx) {
    if (result.httpStatus === 403) {
      return {
        ...empty,
        distanceError: result.error?.trim() || 'Sei fuori dalla sede',
        distanceSubtitle: 'Avvicinati al salone per timbrare.',
      };
    }
    return {
      ...empty,
      clockError: result.error ?? 'Impossibile registrare la timbratura.',
    };
  }

  const ux: ClockAttendanceErrorUx = result.errorUx;
  if (ux.kind === 'location') {
    return {
      ...empty,
      gpsError: ux.title,
      gpsSubtitle: ux.subtitle ?? null,
    };
  }
  if (ux.kind === 'geofence') {
    return {
      ...empty,
      distanceError: ux.title,
      distanceSubtitle: ux.subtitle ?? null,
    };
  }
  return {
    ...empty,
    clockError: ux.title,
  };
}

export function gpsCatchUiErrors(err: unknown): ClockAttendanceUiErrors {
  const message = err instanceof Error ? err.message : '';
  if (message === 'Permesso posizione negato') {
    return {
      ...emptyClockAttendanceUiErrors(),
      gpsError: 'Permesso posizione negato',
      gpsSubtitle: 'Abilita la posizione per l’app nelle impostazioni.',
    };
  }
  return {
    ...emptyClockAttendanceUiErrors(),
    gpsError: 'Posizione non disponibile',
    gpsSubtitle: 'Attiva il GPS e riprova.',
  };
}
