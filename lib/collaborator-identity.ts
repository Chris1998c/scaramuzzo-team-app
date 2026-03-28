function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function readStringFromKeys(obj: Record<string, unknown>, keys: readonly string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

/**
 * Molti backend wrappano il body in `data`.
 * Uniamo inner con outer così staff_id e campi annidati restano leggibili.
 */
export function effectiveLoginPayload(data: Record<string, unknown>): Record<string, unknown> {
  const inner = asRecord(data.data);
  if (!inner) {
    return data;
  }
  return { ...data, ...inner };
}

/**
 * Nome collaboratore dal payload login — nessun mapping codice→nome.
 * Ordine: chiavi piatte, poi oggetti tipici `collaborator` / `staff`.
 */
export function collaboratorNameFromLoginPayload(data: Record<string, unknown>): string {
  const flat = readStringFromKeys(data, [
    'collaborator_name',
    'collaborator_full_name',
    'display_name',
    'full_name',
    'first_name',
    'name',
  ]);
  if (flat) {
    return flat;
  }

  const nested =
    asRecord(data.collaborator) ??
    asRecord(data.staff) ??
    asRecord(data.user) ??
    asRecord(data.collaborator_profile);

  if (nested) {
    return readStringFromKeys(nested, [
      'name',
      'full_name',
      'display_name',
      'first_name',
      'last_name',
      'collaborator_name',
    ]);
  }

  return '';
}

/** Primo token per saluto (es. "Nelly Bianchi" → "Nelly"). */
export function firstNameFromDisplayName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return '';
  return t.split(/\s+/)[0] ?? t;
}
