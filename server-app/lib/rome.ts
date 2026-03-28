/**
 * Istante "ora di Roma" come richiesto (wall clock Europe/Rome).
 * Da usare per `created_at` nel DB se la colonna è TIMESTAMP locale.
 */
export function getNowEuropeRome(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
}
