import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_INVALIDATIONS, matchInvalidation } from '../lib/api/resource.ts';

test('SSE event maps to required resources', () => {
  assert.deepEqual(EVENT_INVALIDATIONS['plan.decided'], [
    '/decisions',
    '/plans',
    '/site/status',
    '/site/bottlenecks',
    '/receiving',
    '/audit',
    '/notifications',
  ]);
  assert.equal(matchInvalidation(['/plans'], '/plans/current/instructions'), true);
  assert.equal(matchInvalidation(['/plans'], '/receiving'), false);
});
