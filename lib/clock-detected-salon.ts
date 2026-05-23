export type ClockDetectedSalon = {
  detectedSalonId: number | null;
  detectedSalonName: string | null;
  distanceMeters: number | null;
};

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return null;
  }
  return n;
}

function parseNonNegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

function unwrapPayload(top: Record<string, unknown>): Record<string, unknown> {
  const inner = asRecord(top.data);
  return inner ?? top;
}

/** Salone rilevato dal Manager in risposta POST /api/mobile/attendance/clock. */
export function parseClockDetectedSalon(raw: unknown): ClockDetectedSalon | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }

  const payload = unwrapPayload(raw as Record<string, unknown>);
  const detectedSalonId = parsePositiveInt(payload.detected_salon_id);

  const nameRaw = payload.detected_salon_name;
  const detectedSalonName =
    typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : null;

  const distanceMeters = parseNonNegativeNumber(payload.distance_meters);

  if (detectedSalonId === null && detectedSalonName === null && distanceMeters === null) {
    return null;
  }

  return {
    detectedSalonId,
    detectedSalonName,
    distanceMeters,
  };
}

export function formatClockSuccessMessage(salon: ClockDetectedSalon | null): string {
  const name = salon?.detectedSalonName?.trim();
  const id = salon?.detectedSalonId;
  if (name) {
    return `Presenza registrata a ${name}`;
  }
  if (id != null) {
    return `Presenza registrata nel salone #${id}`;
  }
  return 'Presenza registrata';
}
