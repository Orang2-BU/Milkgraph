import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapApiState } from '../lib/api/demo-state.ts';

test('server state combines decisions, holds, lab decisions, ack and audit', () => {
  const value = mapApiState({ role: 'qa', decisions: [{ plan: 'current', status: 'approved' }], holds: [{ id: 'HOLD-001' }], labs: [{ id: 'LAB-9031', decision: { status: 'dirilis' } }], instructions: [{ id: 'current:RT-26', ackedBy: 'Dimas' }], limits: { holdingMin: 620 }, audit: [{ id: 5 }] });
  assert.equal(value.role, 'qa');
  assert.equal(value.decisions[0].plan, 'current');
  assert.equal(value.holds[0].id, 'HOLD-001');
  assert.equal(value.labs['LAB-9031'].status, 'dirilis');
  assert.deepEqual(value.acks, ['current:RT-26']);
  assert.equal(value.log[0].id, 5);
});
