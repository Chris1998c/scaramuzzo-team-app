import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loginErrorUxForStatus } from '../mobile-login-errors';

describe('loginErrorUxForStatus', () => {
  it('maps 429 to PIN rate limit message', () => {
    const ux = loginErrorUxForStatus(429, {});
    assert.equal(ux.title, 'Troppi tentativi');
    assert.match(ux.message, /PIN/i);
  });

  it('maps 503 JWT config to admin message', () => {
    const ux = loginErrorUxForStatus(503, { error: 'MOBILE_JWT_SECRET missing' });
    assert.equal(ux.title, 'Servizio non disponibile');
    assert.match(ux.message, /amministratore/i);
  });

  it('maps 403 inactive staff', () => {
    const ux = loginErrorUxForStatus(403, { error: 'staff inactive' });
    assert.equal(ux.title, 'Accesso non consentito');
    assert.match(ux.message, /non è attivo/i);
  });
});
