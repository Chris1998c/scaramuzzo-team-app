import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Contratto Team App ↔ Manager: lo staff_id nel body è solo allineamento;
 * l’identità reale è il JWT (sid). Un client non deve mai spedire lo staff_id di un collega.
 */
describe('mobile staff_id body binding (Team App contract)', () => {
  function assertBodyStaffMatchesSession(sessionStaffId: number, bodyStaffId: number) {
    if (bodyStaffId !== sessionStaffId) {
      throw new Error('Forbidden: body staff_id diverso dalla sessione');
    }
  }

  it('rifiuta body staff_id di un collega (sede diversa)', () => {
    const sessionA = 101;
    assert.throws(
      () => assertBodyStaffMatchesSession(sessionA, 202),
      /Forbidden/,
    );
  });

  it('accetta solo lo staff_id della sessione corrente', () => {
    assert.doesNotThrow(() => assertBodyStaffMatchesSession(101, 101));
  });
});
