import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResourceStore } from '../lib/api/resource-store.ts';

test('resource cache reports loading, failure, retry, and invalidation without stale mock fallback', async () => {
  let calls = 0;
  const store = createResourceStore(async () => {
    calls++;
    if (calls === 1) throw new Error('offline');
    return { value: calls };
  });
  assert.deepEqual(store.snapshot('/receiving'), { loading: true });
  assert.equal(store.snapshot('/receiving'), store.snapshot('/receiving'), 'snapshot identity stable for React');
  await store.load('/receiving');
  assert.equal(store.snapshot('/receiving').error?.message, 'offline');
  assert.equal(store.snapshot('/receiving').data, undefined);
  await store.load('/receiving');
  assert.deepEqual(store.snapshot('/receiving').data, { value: 2 });
  store.invalidate(['/receiving']);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(store.snapshot('/receiving').data, { value: 3 });
  await store.load('/role-sensitive');
  assert.equal(calls, 4);
  store.invalidate();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls, 6);
});

test('invalidate rejects stale response from an older fetch', async () => {
  let resolveOld;
  let calls = 0;
  const store = createResourceStore(() => {
    calls++;
    return calls === 1 ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ value: 'fresh' });
  });
  const old = store.load('/receiving');
  store.invalidate(['/receiving']);
  await new Promise(resolve => setTimeout(resolve, 0));
  resolveOld({ value: 'stale' });
  await old;
  assert.deepEqual(store.snapshot('/receiving').data, { value: 'fresh' });
});
