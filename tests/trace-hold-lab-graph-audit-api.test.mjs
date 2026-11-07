import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../components/${path}`, import.meta.url), 'utf8');

test('trace API uses server answer, templates, event, graph, locations, genealogy', () => {
  const trace = read('trace/trace.tsx');
  for (const path of [
    '/quality/active-event',
    '/assistant/templates',
    '/assistant/ask',
    '/trace/forward',
    '/trace/backward',
    '/trace/explain',
    '/trace/handoffs',
    '/holds/summary',
    '/holds',
    '/lots/locations',
  ]) {
    assert.ok(trace.includes(path), `missing ${path} in trace.tsx`);
  }
  assert.match(trace, /await submitHold/);
  assert.match(trace, /Gagal memuat Traceability/);
  assert.match(trace, /Memuat Traceability/);

  const eg = read('trace/evidence-graph.tsx');
  assert.match(eg, /API_MODE[\s\S]*\/graph/);
  assert.match(eg, /Gagal memuat graph/);
  assert.match(eg, /Memuat graph/);

  const gen = read('trace/genealogy.tsx');
  assert.match(gen, /API_MODE[\s\S]*\/holds\/\$\{hold\.id\}\/genealogy/);
  assert.match(gen, /Gagal memuat genealogi/);
  assert.match(gen, /Memuat genealogi/);
});

test('hold API lists server holds, locations, summary; review awaits without mock fallback', () => {
  const src = read('hold/hold.tsx');
  for (const path of ['/holds', '/holds/summary', '/lots/locations']) {
    assert.ok(src.includes(path), `missing ${path} in hold.tsx`);
  }
  assert.match(src, /await reviewHold/);
  assert.match(src, /Gagal memuat Daftar Hold/);
  assert.match(src, /Memuat Daftar Hold/);
  assert.match(src, /pastHolds\.some/);
});

test('lab API uses backend results and summary; decision awaits without mock fallback', () => {
  const src = read('lab/lab.tsx');
  for (const path of ['/lab/results', '/lab/summary']) {
    assert.ok(src.includes(path), `missing ${path} in lab.tsx`);
  }
  assert.match(src, /await decideLab/);
  assert.match(src, /Gagal memuat Hasil Lab/);
  assert.match(src, /Memuat Hasil Lab/);
  assert.match(src, /summaryRes\.data\?\.avgWaitMin/);
});

test('context graph and audit consume server data without mock fallback', () => {
  const cg = read('graph/context-graph.tsx');
  assert.match(cg, /useResource[^\n]*\/graph/);
  assert.match(cg, /Gagal memuat Context Graph/);
  assert.match(cg, /Memuat Context Graph/);

  const audit = read('persetujuan/persetujuan.tsx');
  assert.match(audit, /useResource[^\n]*\/audit/);
  assert.match(audit, /Gagal memuat Riwayat Persetujuan/);
  assert.match(audit, /Memuat Riwayat Persetujuan/);
  assert.match(audit, /\/api\/v1\/audit\.csv/);
});

