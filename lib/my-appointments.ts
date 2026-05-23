import { formatYmdInEuropeRome } from '@/lib/date-rome';
import { postMobileJson, readMobileErrorPayload } from '@/lib/api-session';
import { withCurrentSalonId } from '@/lib/mobile-salon-session';

/** Riga appuntamento — allineata a POST /api/mobile/my-appointments */
export type MyAppointmentRow = {
  id: number;
  start_time: string;
  end_time: string | null;
  status: string | null;
  customer_name: string;
  services: string[];
};

const STATUS_IT: Record<string, string> = {
  scheduled: 'Programmato',
  confirmed: 'Confermato',
  completed: 'Completato',
  cancelled: 'Annullato',
  canceled: 'Annullato',
  in_progress: 'In corso',
  no_show: 'Non presente',
  pending: 'In attesa',
};

/** Chiave giorno YYYY-MM-DD dell’istante `start_time` nel fuso Europe/Rome. */
export function dateKeyFromStart(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatYmdInEuropeRome(d);
}

/** “Oggi” per filtri agenda / preview — calendario in Europe/Rome (non ora locale device). */
export function todayDateKey(): string {
  return formatYmdInEuropeRome(new Date());
}

export function filterTodayRows(rows: MyAppointmentRow[]): MyAppointmentRow[] {
  const tk = todayDateKey();
  return rows
    .filter((r) => dateKeyFromStart(r.start_time) === tk)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

export function formatAppointmentTime(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function formatStatusLabel(status: string | null | undefined): string {
  if (status == null || status === '') return '—';
  const raw = String(status).trim();
  const key = raw.toLowerCase().replace(/\s+/g, '_');
  if (STATUS_IT[key]) return STATUS_IT[key];
  return raw.replace(/_/g, ' ');
}

export function servicesPreview(services: string[], maxLen = 52): string {
  if (!services.length) return '';
  const line = services.join(' · ');
  if (line.length <= maxLen) return line;
  return `${line.slice(0, maxLen - 1)}…`;
}

/**
 * Carica tutti gli appuntamenti del collaboratore (stesso endpoint della schermata Appuntamenti).
 */
export async function fetchMyAppointments(
  staffId: number
): Promise<
  | { ok: true; rows: MyAppointmentRow[] }
  | { ok: false; error?: string; sessionEnded?: true }
> {
  try {
    const body = await withCurrentSalonId({ staff_id: staffId });
    const result = await postMobileJson<{
      success?: boolean;
      rows?: MyAppointmentRow[];
      error?: string;
    }>('/api/mobile/my-appointments', body);

    if (result.kind === 'unauthorized') {
      return { ok: false, sessionEnded: true };
    }

    if (result.kind === 'error') {
      return {
        ok: false,
        error: readMobileErrorPayload(result.data) ?? 'Impossibile caricare gli appuntamenti.',
      };
    }

    const data = result.data;
    if (data == null || typeof data !== 'object') {
      return { ok: false, error: 'Risposta non valida dal server.' };
    }
    if (data.success === false) {
      return {
        ok: false,
        error: readMobileErrorPayload(data) ?? 'Impossibile caricare gli appuntamenti.',
      };
    }
    if (!Array.isArray(data.rows)) {
      return {
        ok: false,
        error: readMobileErrorPayload(data) ?? 'Risposta non valida dal server.',
      };
    }

    return { ok: true, rows: data.rows };
  } catch {
    return { ok: false, error: 'Connessione non disponibile.' };
  }
}
