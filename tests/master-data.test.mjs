import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('navigation includes master-data tab (Master Alat)', () => {
  const nav = read('lib/nav.ts');
  assert.ok(nav.includes('"/master-data"'), 'nav missing /master-data route');
  assert.ok(nav.includes('"Master Alat"'), 'nav missing Master Alat label');
});

test('master-data view queries master endpoints and changeover classifier in API mode', () => {
  const comp = read('components/master-data/master-data.tsx');
  for (const path of ['/master', '/master/assets', '/master/connections', '/master/finished-skus', '/master/lines']) {
    assert.ok(comp.includes(`"${path}"`), `master-data view missing ${path}`);
  }
  assert.ok(comp.includes('"/master/changeover/classify"'), 'master-data view missing /master/changeover/classify');
  assert.match(comp, /numericalPlanningReady/);
  assert.match(comp, /AT_SAME_PRODUCT/);
  assert.match(comp, /asset_connections\.csv/);
});
