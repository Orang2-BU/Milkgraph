import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const data = JSON.parse(readFileSync(new URL("../mock/scenario.json", import.meta.url), "utf8"));
const sources = new Set(data.sources.map(s => s.id));

test("Receiving snapshot agrees with itself: lab wait, stage counts, asset levels", () => {
  const lab = data.tankers.filter(t => t.stage === "Lab test");
  assert.equal(Math.round(lab.reduce((sum, t) => sum + t.wait, 0) / lab.length), 52);
  for (const stage of ["Sampling", "Lab test", "Released", "Unloading"]) {
    assert.equal(data.stages.find(s => s.label === stage).count, data.tankers.filter(t => t.stage === stage).length, stage);
  }
  for (const asset of data.assets) assert.ok(asset.fill >= 0 && asset.fill <= asset.capacity, asset.id);
  for (const item of [...data.metrics, ...data.tankers, ...data.assets]) assert.ok(sources.has(item.source), item.source);
});
test("Genealogy: backward mix sums to 100%, forward lots carry the same RT-04 share as the graph edges", () => {
  const backward = data.answers.find(a => a.id === "backward");
  assert.equal(backward.mix.reduce((sum, m) => sum + m.percent, 0), 100);
  const rt04 = backward.mix.find(m => m.id === "RT-04").percent;
  const forward = data.answers.find(a => a.id === "forward");
  assert.equal(forward.lots.find(l => l.id === data.qcEvent.lot).percent, rt04);
  for (const lot of forward.lots) {
    const node = data.graph.nodes.find(n => n.label === lot.id);
    const edge = data.graph.edges.find(e => e.target === node.id);
    assert.equal(edge.label, `FILLED ${lot.percent}%`, lot.id);
  }
  assert.ok(forward.lots.length < data.holdBaseline.lots);
  assert.ok(forward.lots.reduce((sum, l) => sum + l.packs, 0) < data.holdBaseline.packs);
});
test("Every answer reference and graph edge resolves", () => {
  const nodes = new Set(data.graph.nodes.map(n => n.id));
  const edges = new Set(data.graph.edges.map(e => e.id));
  for (const node of data.graph.nodes) assert.ok(sources.has(node.source), node.source);
  for (const e of data.graph.edges) { assert.ok(nodes.has(e.source), e.id); assert.ok(nodes.has(e.target), e.id); }
  for (const answer of data.answers) {
    for (const f of answer.factors) assert.ok(sources.has(f.source), f.source);
    for (const n of answer.nodes) assert.ok(nodes.has(n), n);
    for (const e of answer.edges) assert.ok(edges.has(e), e);
  }
});
test("Plans: past is untouched, only violations overlap, and the solver result breaks no constraint", () => {
  const now = 102;
  for (const plan of data.plans) {
    for (const variant of ["before", "after"]) {
      const blocks = plan[variant];
      for (const block of blocks) {
        assert.ok(block.start >= 0 && block.end <= 420 && block.end > block.start);
        assert.ok(sources.has(block.source), block.source);
      }
      for (const resource of new Set(blocks.map(b => b.resource))) {
        const row = blocks.filter(b => b.resource === resource && b.type !== "violation").sort((a, b) => a.start - b.start);
        for (let i = 1; i < row.length; i++) assert.ok(row[i].start >= row[i - 1].end, `${plan.id} ${variant} overlap on ${resource}`);
      }
    }
    const past = blocks => blocks.filter(b => b.start < now).map(b => ({ ...b, end: Math.min(b.end, now) }));
    assert.deepEqual(past(plan.before), past(plan.after));
    assert.equal(plan.constraints.length, 6);
    assert.ok(plan.constraints.some(c => !c.before.ok));
    assert.ok(plan.constraints.every(c => c.after.ok));
    assert.equal(plan.after.filter(b => b.type === "violation").length, 0);
    for (const c of plan.constraints) assert.ok(sources.has(c.source), c.source);
    // Unloading in a bay may not start while that bay is in CIP.
    const cip = plan.after.find(b => b.type === "cip");
    assert.ok(plan.after.filter(b => b.resource === cip.resource && b.type === "unload").every(b => b.end <= cip.start || b.start >= cip.end));
    // RT-26 must finish unloading before its holding-time limit (15.52 = 172 min after 13.00).
    assert.ok(plan.after.find(b => b.label === "RT-26" && b.type === "unload").end <= 172);
  }
});
