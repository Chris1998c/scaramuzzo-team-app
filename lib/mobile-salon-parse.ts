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

/** Estrae `salon_ids[]` dal payload login; fallback su `salon_id` singolo. */
export function parseSalonIdsFromLoginPayload(payload: Record<string, unknown>): number[] {
  const raw = payload.salon_ids;
  const ids: number[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const n = parsePositiveInt(item);
      if (n !== null && !ids.includes(n)) {
        ids.push(n);
      }
    }
  }

  if (ids.length > 0) {
    return ids;
  }

  const primary = parsePositiveInt(payload.salon_id);
  return primary !== null ? [primary] : [];
}

export function primarySalonIdFromLoginPayload(
  payload: Record<string, unknown>,
  salonIds: number[]
): number | null {
  const fromField = parsePositiveInt(payload.salon_id);
  if (fromField !== null) {
    return fromField;
  }
  return salonIds[0] ?? null;
}

export function parseSalonIdsJson(raw: string | null): number[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const ids: number[] = [];
    for (const item of parsed) {
      const n = parsePositiveInt(item);
      if (n !== null && !ids.includes(n)) {
        ids.push(n);
      }
    }
    return ids;
  } catch {
    return [];
  }
}

export function parsePositiveSalonId(value: unknown): number | null {
  return parsePositiveInt(value);
}
