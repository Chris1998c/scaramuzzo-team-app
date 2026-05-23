import { readMobileErrorPayload } from '@/lib/mobile-error-payload';

export type LoginErrorUx = {
  title: string;
  message: string;
};

function payloadText(payload: unknown): string {
  const fromApi = readMobileErrorPayload(payload);
  return (fromApi ?? '').toLowerCase();
}

/**
 * Messaggi login allineati al Manager hardened (403 / 429 / 503).
 */
export function loginErrorUxForStatus(status: number, payload: unknown): LoginErrorUx {
  const text = payloadText(payload);

  if (status === 429) {
    return {
      title: 'Troppi tentativi',
      message:
        'Hai inserito il PIN troppe volte. Attendi qualche minuto e riprova.',
    };
  }

  if (status === 503) {
    if (
      text.includes('mobile_jwt') ||
      text.includes('jwt_secret') ||
      text.includes('non configurat') ||
      text.includes('not configured')
    ) {
      return {
        title: 'Servizio non disponibile',
        message:
          "L'app mobile non è configurata sul server. Contatta l'amministratore.",
      };
    }
    return {
      title: 'Servizio non disponibile',
      message: 'Il servizio mobile non è momentaneamente disponibile. Riprova più tardi.',
    };
  }

  if (status === 403) {
    if (
      text.includes('inactive') ||
      text.includes('disattiv') ||
      text.includes('non attiv') ||
      text.includes('staff')
    ) {
      return {
        title: 'Accesso non consentito',
        message:
          'Il tuo profilo collaboratore non è attivo. Contatta il responsabile del salone.',
      };
    }
    if (
      text.includes('mobile') ||
      text.includes('app mobile') ||
      text.includes('disabled')
    ) {
      return {
        title: 'App mobile disabilitata',
        message:
          "L'accesso da app non è abilitato per il tuo account. Contatta l'amministratore.",
      };
    }
    return {
      title: 'Accesso non consentito',
      message:
        readMobileErrorPayload(payload) ??
        'Non hai i permessi per accedere da questa app.',
    };
  }

  if (status === 401) {
    return {
      title: 'Credenziali non valide',
      message: readMobileErrorPayload(payload) ?? 'Codice o PIN non corretti.',
    };
  }

  return {
    title: 'Errore di accesso',
    message: readMobileErrorPayload(payload) ?? 'Errore durante il login. Riprova.',
  };
}
