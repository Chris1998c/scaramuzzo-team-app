import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatClockSuccessMessage,
  parseClockDetectedSalon,
} from '../clock-detected-salon';

describe('parseClockDetectedSalon', () => {
  it('reads fields from top-level payload', () => {
    const salon = parseClockDetectedSalon({
      detected_salon_id: 3,
      detected_salon_name: 'Scaramuzzo Centro',
      distance_meters: 42.5,
    });
    assert.deepEqual(salon, {
      detectedSalonId: 3,
      detectedSalonName: 'Scaramuzzo Centro',
      distanceMeters: 42.5,
    });
  });

  it('unwraps data wrapper', () => {
    const salon = parseClockDetectedSalon({
      success: true,
      data: {
        detected_salon_id: 7,
        detected_salon_name: 'Sede Nord',
      },
    });
    assert.equal(salon?.detectedSalonId, 7);
    assert.equal(salon?.detectedSalonName, 'Sede Nord');
  });
});

describe('formatClockSuccessMessage', () => {
  it('uses salon name when available', () => {
    const msg = formatClockSuccessMessage({
      detectedSalonId: 2,
      detectedSalonName: 'Scaramuzzo Centro',
      distanceMeters: 10,
    });
    assert.equal(msg, 'Presenza registrata a Scaramuzzo Centro');
  });

  it('falls back to salon id without name', () => {
    const msg = formatClockSuccessMessage({
      detectedSalonId: 5,
      detectedSalonName: null,
      distanceMeters: null,
    });
    assert.equal(msg, 'Presenza registrata nel salone #5');
  });
});
