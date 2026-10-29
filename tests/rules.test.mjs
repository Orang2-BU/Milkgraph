import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_LIMITS, evaluate, instructions, violations } from "../lib/rules.ts";
const data = JSON.parse(readFileSync(new URL("../mock/scenario.json", import.meta.url), "utf8"));
const [current, whatIf] = data.plans;
const ok = (plan, view, limits = DEFAULT_LIMITS) => Object.fromEntries(Object.entries(evaluate(plan, view, limits)).map(([id, c]) => [id, c.ok]));

test("Default limits reproduce the proposal: FIFO breaks flow, holding, CIP; recommendation breaks none", () => {
  for (const plan of [current, whatIf]) {
    assert.deepEqual(ok(plan, "before"), { flow: false, maintenance: true, holding: false, cip: false, tank: true, changeover: true }, plan.id);
    assert.equal(violations(plan, "before", DEFAULT_LIMITS), 3, plan.id);
    assert.equal(violations(plan, "after", DEFAULT_LIMITS), 0, plan.id);
  }
});
test("Texts carry the numbers from the scenario", () => {
  const before = evaluate(current, "before", DEFAULT_LIMITS), after = evaluate(current, "after", DEFAULT_LIMITS);
  assert.match(before.flow.text, /45 menit/);
  assert.match(before.holding.text, /16\.15.*15\.52/);
  assert.match(after.holding.text, /15\.50.*2 menit/);
  assert.match(before.cip.text, /RT-26.*Bay 2.*15\.20/);
  assert.match(evaluate(whatIf, "after", DEFAULT_LIMITS).flow.text, /15 menit/);
});
test("Changed limits change the verdict", () => {
  assert.equal(ok(current, "after", { ...DEFAULT_LIMITS, holdingMin: 620 }).holding, false);
  assert.equal(ok(current, "before", { ...DEFAULT_LIMITS, holdingMin: 660 }).holding, true);
  assert.equal(ok(whatIf, "after", { ...DEFAULT_LIMITS, starvationTol: 10 }).flow, false);
  assert.equal(ok(current, "after", { ...DEFAULT_LIMITS, cipBuffer: 10 }).cip, false);
  assert.equal(ok(current, "after", { ...DEFAULT_LIMITS, tankMax: 92 }).tank, false);
  assert.equal(ok(current, "after", { ...DEFAULT_LIMITS, changeoverMax: 0 }).changeover, false);
  assert.equal(ok(current, "after", { ...DEFAULT_LIMITS, maintenanceBay3: true }).maintenance, false);
});
test("Greenfields definitions: max transfer rate, holding per step, breakdown, SOP sequence", () => {
  const before = evaluate(current, "before", DEFAULT_LIMITS), after = evaluate(current, "after", DEFAULT_LIMITS);
  assert.match(before.flow.text, /10\.200 L\/jam.*9\.000 L\/jam/, "flow names the transfer rate it needs");
  assert.match(before.flow.text, /F2 dan F4/, "AT-2 feeds two filling lines");
  assert.equal(ok(current, "after", { ...DEFAULT_LIMITS, maxTransfer: 8_400 }).flow, false);
  assert.match(after.holding.text, /RMT-2/, "holding is checked per step, buffer included");
  assert.equal(ok(current, "after", { ...DEFAULT_LIMITS, bufferMaxMin: 900 }).holding, false);
  assert.equal(ok(current, "after", { ...DEFAULT_LIMITS, breakdownF1: true }).cip, false);
  assert.match(after.changeover.text, /SOP 35 menit/);
  const rushed = { ...current, after: current.after.map(b => b.type === "changeover" ? { ...b, end: b.start + 20 } : b) };
  assert.equal(ok(rushed, "after").changeover, false, "changeover shorter than the SOP matrix breaks the rule");
});
test("Approved recommendation becomes instructions: moved RTs for receiving, F2 supply for supervisor", () => {
  const list = instructions(current);
  const rt26 = list.find(i => i.id === "current:RT-26");
  assert.equal(rt26.role, "receiving");
  assert.match(rt26.text, /RT-26.*Bay 1.*15\.15 - 15\.50/);
  assert.match(rt26.from, /Bay 2.*14\.50/);
  assert.ok(!list.some(i => i.id === "current:RT-23"), "unchanged RT is not an instruction");
  const f2 = list.find(i => i.role === "supervisor");
  assert.match(f2.text, /F2 dan F4.*45.*0 menit/);
});
