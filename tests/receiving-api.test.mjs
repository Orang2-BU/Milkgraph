import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receivingHeadline } from '../components/receiving/api-view.ts';

test('receiving headline uses backend verdict and incident, not local rules', () => {
  assert.equal(receivingHeadline({ violations: { before: 4 } }, [], { rt: 'RT-99', holdingLeftMin: 45 }), 'Rencana tidak layak, 4 constraint dilanggar.');
  assert.equal(receivingHeadline({ violations: { before: 4 } }, [{ plan: 'current', status: 'approved' }], { rt: 'RT-99', holdingLeftMin: 45 }), 'Rekomendasi disetujui, RT-99 pindah ke Bay 1.');
});
