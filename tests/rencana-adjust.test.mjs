import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_LIMITS, evaluate, transferNeed } from "../lib/rules.ts";
import { applyToLimits, badgeOf, isModelled } from "../components/rencana/adjust.ts";
import { events, projectBlocks, projectChecks, statusAt } from "../components/rencana/projection.ts";

const { plans } = JSON.parse(readFileSync(new URL("../mock/scenario.json", import.meta.url), "utf8"));
const current = plans[0];
const failed = checks => Object.values(checks).filter(c => !c.ok).length;
const project = (view, adj) => {
  const limits = applyToLimits(DEFAULT_LIMITS, adj);
  const blocks = projectBlocks(current[view], transferNeed(view), adj, DEFAULT_LIMITS.maxTransfer);
  return { blocks, checks: projectChecks(evaluate, current, view, blocks, limits) };
};

test("tanpa pengaturan, proyeksi sama dengan rencana dan batas tidak berubah", () => {
  assert.deepEqual(applyToLimits(DEFAULT_LIMITS, {}), DEFAULT_LIMITS);
  assert.equal(failed(project("before", {}).checks), 3);
  assert.equal(failed(project("after", {}).checks), 0);
});

test("rencana awal pukul 16.00: F2 berhenti, AT-2 kosong; Bay 2 bentrok CIP pukul 15.00", () => {
  const { blocks } = project("before", {});
  assert.equal(statusAt(blocks, 180, {}).F2.status, "Berhenti, AT-2 kosong");
  assert.equal(statusAt(blocks, 180, {})["AT-2"].tone, "crit");
  assert.equal(statusAt(blocks, 120, {})["Bay 2"].tone, "crit");
});

test("upgrade UHT-2 +25% cukup untuk laju yang dibutuhkan: F2 dan F4 tidak berhenti", () => {
  const adj = { "UHT-2": { upgrade: 25 } };
  const { blocks, checks } = project("before", adj);
  assert.equal(statusAt(blocks, 180, adj).F2.status, "Jalan");
  assert.equal(checks.flow.ok, true);
  assert.equal(failed(checks), 2);
});

test("maintenance Bay 1 pukul 15.00 selama 30 menit membuat bongkar RT-23 bentrok", () => {
  const adj = { "Bay 1": { maintenance: { start: "15.00", minutes: 30 } } };
  const { blocks, checks } = project("after", adj);
  assert.equal(checks.maintenance.ok, false);
  assert.match(checks.maintenance.text, /RT-23.*Bay 1.*14\.25/);
  assert.equal(statusAt(blocks, 125, adj)["Bay 1"].tone, "crit");
  assert.ok(events(blocks).some(e => e.text.includes("Bay 1 maintenance 30 menit")));
});

test("alat di luar jadwal: status berubah saat maintenance, efek lanjutannya ditandai belum dimodelkan", () => {
  const adj = { "MX-1": { maintenance: { start: "15.00", minutes: 30 } } };
  assert.equal(statusAt(project("after", adj).blocks, 130, adj)["MX-1"].status, "Maintenance");
  assert.equal(isModelled("MX-1", adj["MX-1"]), false);
  assert.equal(isModelled("UHT-2", { upgrade: 25 }), true);
  assert.equal(badgeOf({ upgrade: 25, maintenance: { start: "15.00", minutes: 45 } }), "Upgrade +25% · Maintenance 15.00, 45 menit");
  assert.equal(badgeOf({}), undefined);
});
