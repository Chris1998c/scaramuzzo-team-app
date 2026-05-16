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

/** Etichetta periodo KPI in Home (“I miei numeri”). */
export const STATS_PERIOD_THIS_MONTH = 'Questo mese';

export const STATS_UNAVAILABLE_MESSAGE = 'Statistiche momentaneamente non disponibili';
export const STATS_RETRY_MESSAGE = 'Riprova più tardi';

/** Copia utente a due righe per errori statistiche (Home, Statistiche). */
export function statsErrorCopy(): { title: string; hint: string } {
  return { title: STATS_UNAVAILABLE_MESSAGE, hint: STATS_RETRY_MESSAGE };
}

/** Messaggio compatto (una riga) — non espone dettagli tecnici al di fuori del parser. */
export function friendlyStatsError(_msg?: string): string {
  const { title, hint } = statsErrorCopy();
  return `${title}. ${hint}.`;
}

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
  } else if (Array.isArray(sales.by_product) || sales.by_product != null) {
    productsSoldQty = sumProductsLenient(sales.by_product);
  } else {
    return {
      ok: false,
      error: 'sales_attributed: by_product deve essere un array oppure indicare total_products_qty (o products_qty).',
    };
  }

  const byCategory = parseByCategoryLenient(operational.by_category);
  const topServices = parseAppointmentLinesLenient(operational);
  const topProducts = parseByProductLenient(sales.by_product);

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

const CATEGORY_NAME_KEYS = [
  'category_name',
  'category',
  'categoryName',
  'name',
  'label',
  'title',
] as const;
const SERVICE_NAME_KEYS = [
  'service_name',
  'service',
  'serviceName',
  'name',
  'label',
  'service_label',
  'title',
  'nome',
  'descrizione',
] as const;
const PRODUCT_NAME_KEYS = [
  'product_name',
  'product',
  'productName',
  'name',
  'label',
  'title',
  'nome',
  'descrizione',
] as const;
const RANK_COUNT_KEYS = ['count', 'total', 'qty', 'quantity', 'n', 'num', 'lines', 'appointments'] as const;

/** Righe classifica: array di oggetti, tuple [nome, qty] o mappa { nome: qty }. Righe non parseabili → saltate. */
function parseRankedRowsLenient(
  raw: unknown,
  nameKeys: readonly string[],
  qtyKeys: readonly string[]
): { name: string; qty: number }[] {
  if (raw == null) {
    return [];
  }

  const push = (out: { name: string; qty: number }[], name: string, qty: number) => {
    if (name && Number.isFinite(qty)) {
      out.push({ name, qty });
    }
  };

  if (!Array.isArray(raw)) {
    const map = asRecord(raw);
    if (!map) {
      return [];
    }
    const out: { name: string; qty: number }[] = [];
    for (const [k, v] of Object.entries(map)) {
      const label = k.trim();
      const n = coerceFiniteNumber(v);
      if (label && n !== null) {
        push(out, label, n);
      }
    }
    out.sort((a, b) => b.qty - a.qty);
    return out;
  }

  const out: { name: string; qty: number }[] = [];
  for (const row of raw) {
    if (Array.isArray(row) && row.length >= 2) {
      const name =
        typeof row[0] === 'string'
          ? row[0].trim()
          : row[0] != null
            ? String(row[0]).trim()
            : '';
      const n = coerceFiniteNumber(row[1]);
      if (name && n !== null) {
        push(out, name, n);
      }
      continue;
    }
    const r = asRecord(row);
    if (!r) {
      continue;
    }
    const name = rowString(r, nameKeys);
    const qty = tryFirstNumber(r, qtyKeys) ?? rowQty(r);
    if (name && qty !== null) {
      push(out, name, qty);
    }
  }
  out.sort((a, b) => b.qty - a.qty);
  return out;
}

function parseByCategoryLenient(raw: unknown): CategoryStatRow[] {
  return parseRankedRowsLenient(raw, CATEGORY_NAME_KEYS, RANK_COUNT_KEYS).map((r) => ({
    category_name: r.name,
    count: r.qty,
  }));
}

function parseAppointmentLinesLenient(operational: Record<string, unknown>): ServiceLineStatRow[] {
  const raw =
    operational.appointment_lines_by_service ??
    operational.appointmentLinesByService ??
    operational.lines_by_service ??
    operational.services_by_name;
  return parseRankedRowsLenient(raw, SERVICE_NAME_KEYS, RANK_COUNT_KEYS).map((r) => ({
    name: r.name,
    count: r.qty,
  }));
}

function parseByProductLenient(raw: unknown): ProductStatRow[] {
  return parseRankedRowsLenient(raw, PRODUCT_NAME_KEYS, RANK_COUNT_KEYS).map((r) => ({
    name: r.name,
    qty: r.qty,
  }));
}

function sumProductsLenient(raw: unknown): number {
  return parseByProductLenient(raw).reduce((sum, row) => sum + row.qty, 0);
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
        error: friendlyStatsError(readMobileErrorPayload(result.data) ?? undefined),
      };
    }

    const data = result.data;
    if (data == null || typeof data !== 'object') {
      return { ok: false, error: friendlyStatsError() };
    }

    const top = data as Record<string, unknown>;
    if (top.success === false) {
      return {
        ok: false,
        error: friendlyStatsError(readMobileErrorPayload(data) ?? undefined),
      };
    }

    const rawPayload =
      top.data != null && typeof top.data === 'object' ? top.data : top;

    const parsed = parseStatsPayloadStrict(rawPayload);
    if (!parsed.ok) {
      return { ok: false, error: friendlyStatsError(parsed.error) };
    }

    return { ok: true, view: parsed.view, range };
  } catch {
    return { ok: false, error: friendlyStatsError() };
  }
}
