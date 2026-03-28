import * as SecureStore from 'expo-secure-store';

import { AUTH_STORAGE_KEYS } from '@/constants/auth-storage';
import { postMobileJson, readMobileErrorPayload } from '@/lib/api-session';

/** Preset periodo: giorno corrente o mese di calendario corrente (locale). */
export type StatsPeriodPreset = 'today' | 'month';

export type StatsRange = {
  from: Date;
  to: Date;
  /** Etichetta breve per UI (es. "Oggi" / "Marzo 2025"). */
  labelShort: string;
  /** Sottotitolo (range date leggibile). */
  labelRange: string;
};

export function getStatsRange(preset: StatsPeriodPreset): StatsRange {
  const now = new Date();
  if (preset === 'today') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const labelRange = capitalizeIt(
      from.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
    return { from, to, labelShort: 'Oggi', labelRange };
  }

  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 0, 0, 0, 0);
  const labelShort = capitalizeIt(
    from.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  );
  const labelRange = `${from.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} — ${to.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  return { from, to, labelShort, labelRange };
}

function capitalizeIt(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Contratto backend: date locali in formato YYYY-MM-DD (non ISO datetime). */
export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

/**
 * Il Manager può restituire il body in root, in `data` o in `statistics`.
 */
function extractStatsRoot(raw: unknown): Record<string, unknown> | null {
  const r = asRecord(raw);
  if (!r) {
    return null;
  }
  if (asRecord(r.operational)) {
    return r;
  }
  const d = asRecord(r.data);
  if (d) {
    if (asRecord(d.operational)) {
      return d;
    }
    const innerStats = asRecord(d.statistics);
    if (innerStats && asRecord(innerStats.operational)) {
      return innerStats;
    }
  }
  const st = asRecord(r.statistics);
  if (st && asRecord(st.operational)) {
    return st;
  }
  return r;
}

/** Valore singolo → numero finito, altrimenti null (tipi incompatibili). */
function coerceFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

/**
 * KPI aggregati: nessuna chiave / solo null → "nessun dato" (assente).
 * Chiave presente con valore non numerico → payload rotto.
 */
type KpiScan = { kind: 'ok'; value: number } | { kind: 'absent' } | { kind: 'bad'; key: string; ctx: string };

function scanKpiNumber(
  obj: Record<string, unknown>,
  keys: readonly string[],
  ctx: string
): KpiScan {
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) {
      continue;
    }
    const v = obj[k];
    if (v === undefined || v === null) {
      continue;
    }
    const n = coerceFiniteNumber(v);
    if (n !== null) {
      return { kind: 'ok', value: n };
    }
    return { kind: 'bad', key: k, ctx };
  }
  return { kind: 'absent' };
}

/** Primo campo numerico valido tra chiavi alternative (ordine = priorità backend). */
function tryFirstNumber(obj: Record<string, unknown> | undefined, keys: readonly string[]): number | null {
  if (!obj) {
    return null;
  }
  for (const k of keys) {
    const n = requireFiniteNumber(obj, k);
    if (n !== null) {
      return n;
    }
  }
  return null;
}

function rowString(r: Record<string, unknown>, keys: readonly string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

/** Numero finito obbligatorio (chiave Manager canonica). */
function requireFiniteNumber(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

function rowQty(r: Record<string, unknown>): number | null {
  const q = requireFiniteNumber(r, 'qty');
  if (q !== null) {
    return q;
  }
  const q2 = requireFiniteNumber(r, 'quantity');
  if (q2 !== null) {
    return q2;
  }
  return requireFiniteNumber(r, 'count');
}

export type CategoryStatRow = { category_name: string; count: number };
export type ServiceLineStatRow = { name: string; count: number };
export type ProductStatRow = { name: string; qty: number };

/** Vista UI (KPI + liste) — solo dopo validazione contratto. */
export type MobileStatsView = {
  servicesPerformed: number;
  appointmentsCompleted: number;
  clientsServed: number;
  productsSoldQty: number;
  daysWorked: number;
  byCategory: CategoryStatRow[];
  topServices: ServiceLineStatRow[];
  topProducts: ProductStatRow[];
};

/** Payload valido ma nessun dato nel periodo (KPI a zero e liste vuote). */
export function isStatsEffectivelyEmpty(v: MobileStatsView): boolean {
  return (
    v.servicesPerformed === 0 &&
    v.appointmentsCompleted === 0 &&
    v.clientsServed === 0 &&
    v.productsSoldQty === 0 &&
    v.daysWorked === 0 &&
    v.byCategory.length === 0 &&
    v.topServices.length === 0 &&
    v.topProducts.length === 0
  );
}

/**
 * POST /api/mobile/stats — parser allineato a blocchi operational / sales_attributed / attendance
 * (anche con root in `data` o `statistics`, camelCase su sales_attributed, chiavi KPI alternative elencate).
 */
function parseStatsPayloadStrict(raw: unknown): { ok: true; view: MobileStatsView } | { ok: false; error: string } {
  const root = extractStatsRoot(raw);
  if (!root) {
    return { ok: false, error: 'Risposta statistiche non valida (JSON vuoto o non oggetto).' };
  }

  const operational =
    asRecord(root.operational) ?? asRecord(root.operational_stats);
  const sales =
    asRecord(root.sales_attributed) ?? asRecord(root.salesAttributed);
  const attendance = asRecord(root.attendance);

  if (!operational) {
    return { ok: false, error: 'Manca operational (o operational_stats).' };
  }
  if (!sales) {
    return { ok: false, error: 'Manca sales_attributed (o salesAttributed).' };
  }
  if (!attendance) {
    return { ok: false, error: 'Manca attendance.' };
  }

  const sp = scanKpiNumber(operational, ['services_count', 'services_completed', 'total_services'], 'operational');
  if (sp.kind === 'bad') {
    return { ok: false, error: `${sp.ctx}: valore non numerico per "${sp.key}".` };
  }
  const servicesPerformed = sp.kind === 'ok' ? sp.value : 0;

  const ap = scanKpiNumber(operational, ['completed_appointments', 'appointments_completed'], 'operational');
  if (ap.kind === 'bad') {
    return { ok: false, error: `${ap.ctx}: valore non numerico per "${ap.key}".` };
  }
  const appointmentsCompleted = ap.kind === 'ok' ? ap.value : 0;

  const cs = scanKpiNumber(
    operational,
    ['distinct_customers_agenda', 'clients_served', 'unique_clients', 'customers_served'],
    'operational'
  );
  if (cs.kind === 'bad') {
    return { ok: false, error: `${cs.ctx}: valore non numerico per "${cs.key}".` };
  }
  const clientsServed = cs.kind === 'ok' ? cs.value : 0;

  const dw = scanKpiNumber(attendance, ['worked_days', 'days_worked', 'days'], 'attendance');
  if (dw.kind === 'bad') {
    return { ok: false, error: `${dw.ctx}: valore non numerico per "${dw.key}".` };
  }
  const daysWorked = dw.kind === 'ok' ? dw.value : 0;

  const totalScan = scanKpiNumber(sales, ['total_products_qty', 'products_qty', 'total_qty'], 'sales_attributed');
  if (totalScan.kind === 'bad') {
    return { ok: false, error: `${totalScan.ctx}: valore non numerico per "${totalScan.key}".` };
  }

  let productsSoldQty: number;
  if (totalScan.kind === 'ok') {
    productsSoldQty = totalScan.value;
  } else if (sales.by_product == null) {
    productsSoldQty = 0;
  } else if (Array.isArray(sales.by_product)) {
    const summed = sumProductsStrict(sales.by_product);
    if (summed === null) {
      return {
        ok: false,
        error:
          'sales_attributed.by_product: righe non valide (attesi product_name|product, qty|quantity).',
      };
    }
    productsSoldQty = summed;
  } else {
    return {
      ok: false,
      error: 'sales_attributed: by_product deve essere un array oppure indicare total_products_qty (o products_qty).',
    };
  }

  const byCategory = parseByCategoryStrict(operational.by_category);
  if (byCategory === null) {
    return { ok: false, error: 'operational.by_category: formato non valido.' };
  }

  const topServices = parseAppointmentLinesStrict(operational.appointment_lines_by_service);
  if (topServices === null) {
    return {
      ok: false,
      error:
        'operational.appointment_lines_by_service: formato non valido (service_name|service, count).',
    };
  }

  const topProducts = parseByProductStrict(sales.by_product);
  if (topProducts === null) {
    return { ok: false, error: 'sales_attributed.by_product: formato non valido (product_name|product, qty).' };
  }

  return {
    ok: true,
    view: {
      servicesPerformed,
      appointmentsCompleted,
      clientsServed,
      productsSoldQty,
      daysWorked,
      byCategory,
      topServices,
      topProducts,
    },
  };
}

function parseByCategoryStrict(raw: unknown): CategoryStatRow[] | null {
  if (raw == null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: CategoryStatRow[] = [];
  for (const row of raw) {
    const r = asRecord(row);
    if (!r) {
      return null;
    }
    const category_name = rowString(r, ['category_name', 'category']);
    const count = tryFirstNumber(r, ['count', 'total']);
    if (!category_name || count === null) {
      return null;
    }
    out.push({ category_name, count });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

function parseAppointmentLinesStrict(raw: unknown): ServiceLineStatRow[] | null {
  if (raw == null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: ServiceLineStatRow[] = [];
  for (const row of raw) {
    const r = asRecord(row);
    if (!r) {
      return null;
    }
    const serviceName = rowString(r, ['service_name', 'service']);
    const count = tryFirstNumber(r, ['count', 'total']);
    if (!serviceName || count === null) {
      return null;
    }
    out.push({ name: serviceName, count });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

function parseByProductStrict(raw: unknown): ProductStatRow[] | null {
  if (raw == null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: ProductStatRow[] = [];
  for (const row of raw) {
    const r = asRecord(row);
    if (!r) {
      return null;
    }
    const productName = rowString(r, ['product_name', 'product']);
    const qty = rowQty(r);
    if (!productName || qty === null) {
      return null;
    }
    out.push({ name: productName, qty });
  }
  out.sort((a, b) => b.qty - a.qty);
  return out;
}

function sumProductsStrict(raw: unknown): number | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  let sum = 0;
  for (const row of raw) {
    const r = asRecord(row);
    if (!r) {
      return null;
    }
    const productName = rowString(r, ['product_name', 'product']);
    const qty = rowQty(r);
    if (!productName || qty === null) {
      return null;
    }
    sum += qty;
  }
  return sum;
}

export async function fetchMobileStats(
  staffId: number,
  preset: StatsPeriodPreset
): Promise<
  | { ok: true; view: MobileStatsView; range: StatsRange }
  | { ok: false; error?: string; sessionEnded?: true }
> {
  const range = getStatsRange(preset);
  try {
    const body: Record<string, unknown> = {
      staff_id: staffId,
      from: formatLocalYmd(range.from),
      to: formatLocalYmd(range.to),
    };

    const salonRaw = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.salonId);
    if (salonRaw?.trim()) {
      const n = Number(salonRaw);
      body.salon_id = Number.isFinite(n) ? n : salonRaw.trim();
    }

    const result = await postMobileJson<Record<string, unknown>>('/api/mobile/stats', body);

    if (result.kind === 'unauthorized') {
      return { ok: false, sessionEnded: true };
    }

    if (result.kind === 'error') {
      return {
        ok: false,
        error: readMobileErrorPayload(result.data) ?? 'Impossibile caricare le statistiche.',
      };
    }

    const data = result.data;
    if (data == null || typeof data !== 'object') {
      return { ok: false, error: 'Risposta non valida dal server.' };
    }

    const top = data as Record<string, unknown>;
    if (top.success === false) {
      return {
        ok: false,
        error: readMobileErrorPayload(data) ?? 'Richiesta non valida.',
      };
    }

    const rawPayload =
      top.data != null && typeof top.data === 'object' ? top.data : top;

    const parsed = parseStatsPayloadStrict(rawPayload);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    return { ok: true, view: parsed.view, range };
  } catch {
    return { ok: false, error: 'Connessione non disponibile.' };
  }
}
