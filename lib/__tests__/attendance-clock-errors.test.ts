import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapClockAttendanceErrorUx } from '../attendance-clock-errors';

describe('mapClockAttendanceErrorUx', () => {
  it('detects mock location', () => {
    const ux = mapClockAttendanceErrorUx(400, { error: 'Mock location not allowed' });
    assert.equal(ux.kind, 'location');
    assert.match(ux.subtitle ?? '', /simulata/i);
  });

  it('detects accuracy errors', () => {
    const ux = mapClockAttendanceErrorUx(400, { code: 'ACCURACY_TOO_LOW', error: 'accuracy > 100m' });
    assert.equal(ux.kind, 'location');
    assert.match(ux.subtitle ?? '', /GPS più preciso/i);
  });

  it('detects geofence 403', () => {
    const ux = mapClockAttendanceErrorUx(403, { error: 'Fuori sede' });
    assert.equal(ux.kind, 'geofence');
  });
});
