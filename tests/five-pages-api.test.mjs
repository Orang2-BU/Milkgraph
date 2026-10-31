import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../components/${path}`, import.meta.url), 'utf8');

test('Rencana integrates with API mode: uses /plans and /plans/{id}/check, handles loading/error, awaits decidePlan', () => {
  const rencana = read('rencana/rencana.tsx');
  assert.match(rencana, /API_MODE/);
  assert.match(rencana, /useResource.*"\/plans"/);
  assert.match(rencana, /\/plans\/.*\/check/);
  assert.match(rencana, /await decidePlan\(/);
  assert.match(rencana, /catch/);
  assert.match(rencana, /Memuat data Rencana/);
  assert.match(rencana, /Gagal memuat Rencana/);
  assert.match(rencana, /Tidak ada rencana tersedia/);
  assert.doesNotMatch(rencana, /evaluate\(plan/);
});

test('Constraint integrates with API mode: uses /limits/schema and /plans, checks via API, awaits setLimits', () => {
  const constraint = read('constraint/constraint.tsx');
  assert.match(constraint, /API_MODE/);
  assert.match(constraint, /useResource.*"\/limits\/schema"/);
  assert.match(constraint, /useResource.*"\/plans"/);
  assert.match(constraint, /\/plans\/.*\/check/);
  assert.match(constraint, /await setLimits\(/);
  assert.match(constraint, /catch/);
  assert.match(constraint, /Memuat data Constraint/);
  assert.match(constraint, /Gagal memuat Constraint/);
  assert.doesNotMatch(constraint, /evaluate\(scenario\.plans/);
});

test('Tangki integrates with API mode: uses /assets, /assets/cip-log, /assets/cip-policy, /assets/mid-tanks, /meta, awaits acknowledge', () => {
  const tangki = read('tangki/tangki.tsx');
  assert.match(tangki, /API_MODE/);
  assert.match(tangki, /useResource.*"\/assets"/);
  assert.match(tangki, /useResource.*"\/assets\/cip-log"/);
  assert.match(tangki, /useResource.*"\/assets\/cip-policy"/);
  assert.match(tangki, /useResource.*"\/assets\/mid-tanks"/);
  assert.match(tangki, /useResource.*"\/meta"/);
  assert.match(tangki, /await acknowledge\(/);
  assert.match(tangki, /catch/);
  assert.match(tangki, /Memuat data Bay & Tangki/);
  assert.match(tangki, /Gagal memuat Bay & Tangki/);
});

test('Filling integrates with API mode: uses /production/aseptic-tanks, /production/fillers, /production/unit-states, /production/changeover-matrix, /meta', () => {
  const filling = read('filling/filling.tsx');
  assert.match(filling, /API_MODE/);
  assert.match(filling, /useResource.*"\/production\/aseptic-tanks"/);
  assert.match(filling, /useResource.*"\/production\/fillers"/);
  assert.match(filling, /useResource.*"\/production\/unit-states"/);
  assert.match(filling, /useResource.*"\/production\/changeover-matrix"/);
  assert.match(filling, /useResource.*"\/meta"/);
  assert.match(filling, /Memuat data Lini Filling/);
  assert.match(filling, /Gagal memuat Lini Filling/);
});

test('Pasokan integrates with API mode: uses /supply/farms, /supply/demand-plan, /supply/trend, /supply/demand-sends, /production/fillers, awaits sendDemand', () => {
  const pasokan = read('pasokan/pasokan.tsx');
  assert.match(pasokan, /API_MODE/);
  assert.match(pasokan, /useResource.*"\/supply\/farms"/);
  assert.match(pasokan, /useResource.*"\/supply\/demand-plan"/);
  assert.match(pasokan, /useResource.*"\/supply\/trend"/);
  assert.match(pasokan, /useResource.*"\/supply\/demand-sends"/);
  assert.match(pasokan, /useResource.*"\/production\/fillers"/);
  assert.match(pasokan, /await sendDemand\(/);
  assert.match(pasokan, /catch/);
  assert.match(pasokan, /Memuat data Pasokan & Permintaan/);
  assert.match(pasokan, /Gagal memuat Pasokan & Permintaan/);
});
