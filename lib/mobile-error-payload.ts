/** Messaggio errore da body JSON Manager (`error` o `message`). */
export function readMobileErrorPayload(payload: unknown): string | null {
  if (payload == null || typeof payload !== 'object') {
    return null;
  }
  const o = payload as Record<string, unknown>;
  if (typeof o.error === 'string' && o.error.trim()) {
    return o.error.trim();
  }
  if (typeof o.message === 'string' && o.message.trim()) {
    return o.message.trim();
  }
  return null;
}
