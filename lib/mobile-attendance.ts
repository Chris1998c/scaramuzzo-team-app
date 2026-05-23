import * as Location from 'expo-location';

import { postMobileJson, readMobileErrorPayload } from '@/lib/api-session';
import {
  mapClockAttendanceErrorUx,
  type ClockAttendanceErrorUx,
} from '@/lib/attendance-clock-errors';
import {
  formatClockSuccessMessage,
  parseClockDetectedSalon,
  type ClockDetectedSalon,
} from '@/lib/clock-detected-salon';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { getMobileAppVersion } from '@/lib/mobile-app-version';
import { withCurrentSalonId } from '@/lib/mobile-salon-session';

/** Presenze: lettura POST /api/mobile/attendance; timbratura solo POST .../clock (GPS). Nessun toggle legacy in UI. */

export type AttendanceStatus = 'in' | 'out';

export type AttendanceEventRow = { kind: 'in' | 'out'; timeLabel: string };

/** Vista UI dopo parsing risposta POST /api/mobile/attendance (solo chiavi: status, last_action, today, history). */
export type AttendanceView = {
  status: AttendanceStatus;
  /** Ultima azione, ora locale HH:mm */
  lastActionTime: string | null;
  todayFirstIn: string | null;
  todayLastOut: string | null;
  /** Etichetta minuti lavorati (es. "270 min") */
  workedMinutesLabel: string | null;
  history: AttendanceEventRow[];
};

const MSG_LOAD = 'Impossibile caricare le presenze';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Ora attuale locale HH:mm (ottimistic UI dopo toggle). */
export function formatClockNowHHmm(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Ora locale HH:mm da valore backend (ISO, timestamp, "HH:mm"). */
function parseTimeToHHmm(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    const hm = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(t);
    if (hm) {
      const h = Math.min(23, Math.max(0, parseInt(hm[1], 10)));
      const m = Math.min(59, Math.max(0, parseInt(hm[2], 10)));
      return `${pad2(h)}:${pad2(m)}`;
    }
    const d = Date.parse(t);
    if (!Number.isNaN(d)) {
      const dt = new Date(d);
      return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
    }
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
  }
  return null;
}

function formatWorkedMinutes(n: number): string {
  if (!Number.isFinite(n) || n < 0) {
    return '0 min';
  }
  return `${Math.round(n)} min`;
}

function parseStatusStrict(raw: unknown): AttendanceStatus | null {
  if (raw === 'in' || raw === 'out') {
    return raw;
  }
  return null;
}

/** Ultima azione: stringa/numero ISO, oppure oggetto `{ type?, timestamp }` (Manager). */
function resolveLastActionTime(raw: unknown): string | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  const direct = parseTimeToHHmm(raw);
  if (direct !== null) {
    return direct;
  }
  const o = asRecord(raw);
  if (!o) {
    return null;
  }
  if ('timestamp' in o) {
    return parseTimeToHHmm(o.timestamp);
  }
  return null;
}

function parseHistoryRow(raw: unknown): AttendanceEventRow | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  if (!('type' in r)) {
    return null;
  }
  const kind = parseStatusStrict(r.type);
  if (kind === null) {
    return null;
  }
  const timeRaw = r.at ?? r.created_at;
  const timeLabel = parseTimeToHHmm(timeRaw);
  if (timeLabel === null) {
    return null;
  }
  return { kind, timeLabel };
}

function parseTodayStrict(raw: unknown): {
  firstIn: string | null;
  lastOut: string | null;
  workedLabel: string | null;
} | null {
  if (raw === null || raw === undefined) {
    return { firstIn: null, lastOut: null, workedLabel: null };
  }
  const t = asRecord(raw);
  if (!t) {
    return null;
  }

  const fi = t.first_in;
  const lo = t.last_out;
  const wm = t.worked_minutes;

  const firstIn = fi === undefined || fi === null ? null : parseTimeToHHmm(fi);
  const lastOut = lo === undefined || lo === null ? null : parseTimeToHHmm(lo);
  if (fi !== undefined && fi !== null && firstIn === null) {
    return null;
  }
  if (lo !== undefined && lo !== null && lastOut === null) {
    return null;
  }

  let workedLabel: string | null = null;
  if (wm !== undefined && wm !== null) {
    if (typeof wm === 'number' && Number.isFinite(wm) && wm >= 0 && Number.isInteger(wm)) {
      workedLabel = formatWorkedMinutes(wm);
    }
  }

  return { firstIn, lastOut, workedLabel };
}

function unwrapData(top: Record<string, unknown>): Record<string, unknown> {
  const d = asRecord(top.data);
  if (d) {
    return d;
  }
  return top;
}

function parseAttendancePayload(raw: unknown): { ok: true; view: AttendanceView } | { ok: false } {
  if (raw == null || typeof raw !== 'object') {
    return { ok: false };
  }
  const top = raw as Record<string, unknown>;
  const payload = unwrapData(top);

  if (!Object.prototype.hasOwnProperty.call(payload, 'status')) {
    return { ok: false };
  }
  const status = parseStatusStrict(payload.status);
  if (status === null) {
    return { ok: false };
  }

  const lastRaw = payload.last_action;
  const lastActionTime = resolveLastActionTime(lastRaw);

  let todayFirstIn: string | null = null;
  let todayLastOut: string | null = null;
  let workedMinutesLabel: string | null = null;

  const todayRaw = payload.today;
  if (todayRaw === undefined || todayRaw === null) {
    /* ok */
  } else {
    const parsedToday = parseTodayStrict(todayRaw);
    if (parsedToday === null) {
      todayFirstIn = null;
      todayLastOut = null;
      workedMinutesLabel = null;
    } else {
      todayFirstIn = parsedToday.firstIn;
      todayLastOut = parsedToday.lastOut;
      workedMinutesLabel = parsedToday.workedLabel;
    }
  }

  const histRaw = payload.history;
  let history: AttendanceEventRow[] = [];
  if (histRaw === undefined || histRaw === null) {
    history = [];
  } else if (!Array.isArray(histRaw)) {
    return { ok: false };
  } else {
    for (const row of histRaw) {
      const ev = parseHistoryRow(row);
      if (ev !== null) {
        history.push(ev);
      }
    }
  }

  return {
    ok: true,
    view: {
      status,
      lastActionTime,
      todayFirstIn,
      todayLastOut,
      workedMinutesLabel,
      history,
    },
  };
}

export async function fetchAttendance(
  staffId: number
): Promise<{ ok: true; view: AttendanceView } | { ok: false; error?: string; sessionEnded?: true }> {
  try {
    const body = await withCurrentSalonId({ staff_id: staffId });
    const result = await postMobileJson<Record<string, unknown>>('/api/mobile/attendance', body);

    if (result.kind === 'unauthorized') {
      return { ok: false, sessionEnded: true };
    }

    if (result.kind === 'error') {
      return {
        ok: false,
        error: readMobileErrorPayload(result.data) ?? MSG_LOAD,
      };
    }

    const data = result.data;
    if (data == null || typeof data !== 'object') {
      return { ok: false, error: MSG_LOAD };
    }

    const top = data as Record<string, unknown>;
    if (top.success === false) {
      return {
        ok: false,
        error: readMobileErrorPayload(data) ?? MSG_LOAD,
      };
    }

    const parsed = parseAttendancePayload(data);
    if (!parsed.ok) {
      return { ok: false, error: MSG_LOAD };
    }

    return { ok: true, view: parsed.view };
  } catch {
    return { ok: false, error: MSG_LOAD };
  }
}

export type { ClockDetectedSalon } from '@/lib/clock-detected-salon';

export type ClockAttendanceResult =
  | { ok: true; detectedSalon: ClockDetectedSalon | null; successMessage: string }
  | {
      ok: false;
      error?: string;
      errorUx?: ClockAttendanceErrorUx;
      sessionEnded?: true;
      httpStatus?: number;
    };

/**
 * Timbratura con GPS: POST /api/mobile/attendance/clock
 * (permesso negato o errore posizione → throw per gestione UI.)
 * Non esiste `toggleAttendance` nel client — usare solo questa funzione.
 */
export async function clockAttendance(staffId: number): Promise<ClockAttendanceResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permesso posizione negato');
  }

  let loc: Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>;
  try {
    loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
  } catch {
    throw new Error('GPS_FAILED');
  }

  const [deviceId, appVersion] = await Promise.all([getOrCreateDeviceId(), Promise.resolve(getMobileAppVersion())]);

  const latitude = loc.coords.latitude;
  const longitude = loc.coords.longitude;
  const clockBody = await withCurrentSalonId({
    staff_id: staffId,
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    accuracy: loc.coords.accuracy ?? null,
    isMocked: loc.mocked === true,
    device_id: deviceId,
    app_version: appVersion,
  });

  const result = await postMobileJson<Record<string, unknown>>(
    '/api/mobile/attendance/clock',
    clockBody
  );

  if (result.kind === 'unauthorized') {
    return { ok: false, sessionEnded: true };
  }

  if (result.kind === 'error') {
    const errorUx = mapClockAttendanceErrorUx(
      result.status,
      result.data,
      readMobileErrorPayload(result.data) ?? undefined
    );
    return {
      ok: false,
      error: errorUx.title,
      errorUx,
      httpStatus: result.status,
    };
  }

  const data = result.data;
  if (data == null || typeof data !== 'object') {
    return { ok: false, error: 'Impossibile registrare la timbratura.' };
  }

  const top = data as Record<string, unknown>;
  if (top.success === false) {
    const errorUx = mapClockAttendanceErrorUx(
      undefined,
      data,
      readMobileErrorPayload(data) ?? undefined
    );
    return {
      ok: false,
      error: errorUx.title,
      errorUx,
    };
  }

  const detectedSalon = parseClockDetectedSalon(data);
  return {
    ok: true,
    detectedSalon,
    successMessage: formatClockSuccessMessage(detectedSalon),
  };
}
