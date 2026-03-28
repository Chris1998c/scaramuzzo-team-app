/** Fuso operativo salone — chiave giorno YYYY-MM-DD coerente con preview "oggi". */
export const EUROPE_ROME_TZ = 'Europe/Rome';

export function formatYmdInEuropeRome(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: EUROPE_ROME_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseYmdParts(ymd: string): { y: number; m: number; d: number } | null {
  const p = ymd.split('-').map(Number);
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) {
    return null;
  }
  return { y: p[0], m: p[1], d: p[2] };
}

/** Differenza in giorni di calendario: `dateKey` (YYYY-MM-DD) meno “oggi” in Europe/Rome. */
export function diffCalendarDaysFromTodayRome(dateKeyYmd: string): number | null {
  const today = formatYmdInEuropeRome(new Date());
  const a = parseYmdParts(today);
  const b = parseYmdParts(dateKeyYmd);
  if (!a || !b) {
    return null;
  }
  const da = Date.UTC(a.y, a.m - 1, a.d);
  const db = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((db - da) / 86400000);
}
