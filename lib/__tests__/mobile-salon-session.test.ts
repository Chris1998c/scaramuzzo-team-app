import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseSalonIdsFromLoginPayload,
  parseSalonIdsJson,
  primarySalonIdFromLoginPayload,
} from '../mobile-salon-parse';

describe('parseSalonIdsFromLoginPayload', () => {
  it('reads salon_ids array', () => {
    const ids = parseSalonIdsFromLoginPayload({ salon_ids: [3, 1, 3, 'x', 1] });
    assert.deepEqual(ids, [3, 1]);
  });

  it('falls back to salon_id', () => {
    const ids = parseSalonIdsFromLoginPayload({ salon_id: 7 });
    assert.deepEqual(ids, [7]);
  });

  it('returns empty when missing', () => {
    assert.deepEqual(parseSalonIdsFromLoginPayload({}), []);
  });
});

describe('primarySalonIdFromLoginPayload', () => {
  it('prefers explicit salon_id over array first item', () => {
    const salonIds = [2, 5];
    assert.equal(primarySalonIdFromLoginPayload({ salon_id: 9, salon_ids: salonIds }, salonIds), 9);
  });
});

describe('parseSalonIdsJson', () => {
  it('parses stored json', () => {
    assert.deepEqual(parseSalonIdsJson('[4,2]'), [4, 2]);
  });

  it('returns empty on invalid json', () => {
    assert.deepEqual(parseSalonIdsJson('not-json'), []);
  });
});
