import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_LIMITS, evaluate, transferNeed } from "../lib/rules.ts";
import { affectedPath, bestMaintenance, capacityEffect, checkPlan, equipmentStatus } from "../components/rencana/plan-tools.ts";

const { plans } = JSON.parse(readFileSync(new URL("../mock/scenario.json", import.meta.url), "utf8"));
const tanks = [{ id: "AT-2", sterilizer: "UHT-2", sterilizerState: "jalan", inflow: { before: 6990, after: 8540 }, fillers: ["F2", "F4"] }];
const fillers = [{ id: "F2", state: "jalan", litres: 6400 }, { id: "F4", state: "jalan", litres: 1890 }];
const ids = ["Bay 1", "Bay 2", "RMT-1", "ST-1", "UHT-2", "AT-2", "F2", "F4", "ST-3"];
const ctx = (adj = {}) => ({
  plan: plans[0], adj, limits: DEFAULT_LIMITS, evaluate, tanks, fillers,
  need: { before: transferNeed("before"), after: transferNeed("after") },
  links: [["Bay 1", "RMT-1"], ["RMT-1", "ST-1"], ["ST-1", "UHT-2"], ["UHT-2", "AT-2"], ["AT-2", "F2"], ["AT-2", "F4"]],
  assets: ids.map(id => ({ id, status: id === "ST-3" ? "Terisi" : "Jalan" })),
});

test("cek rencana: angka sama dengan proyeksi Alur rencana", () => {
  assert.equal(checkPlan(ctx(), "before").dilanggar, 3);
  assert.equal(checkPlan(ctx(), "after").dilanggar, 0);
  assert.equal(checkPlan(ctx({ "UHT-2": { upgrade: 25 } }), "before").dilanggar, 2);
});

test("waktu maintenance terbaik tidak bentrok; jam yang bentrok disebut", () => {
  const r = bestMaintenance(ctx(), "after", "Bay 1", 30);
  assert.equal(r.terbaik[0].tambahan_pelanggaran, 0);
  assert.deepEqual(r.terbaik[0].bentrok, []);
  assert.ok(r.semua_bentrok.includes("14.30"));            // RT-23 bongkar di Bay 1 pukul 14.25
  assert.match(bestMaintenance(ctx(), "after", "ST-3", 30).catatan, /tidak punya baris/);
});

test("efek kapasitas: terpakai dibatasi kebutuhan jalur, pelanggaran dihitung ulang", () => {
  const r = capacityEffect(ctx(), "before", "UHT-2", 9000);
  assert.equal(r.tambahan, 2010);
  assert.equal(r.tambahan_terpakai, 1300);
  assert.equal(r.pelanggaran_sebelum, 3);
  assert.equal(r.pelanggaran_sesudah, 2);
});

test("jalur terdampak dan status alat; alat tak dikenal ditolak", () => {
  assert.deepEqual(affectedPath(ctx(), "UHT-2").sesudahnya, ["AT-2", "F2", "F4"]);
  assert.deepEqual(affectedPath(ctx(), "UHT-2").sebelumnya, ["ST-1", "RMT-1", "Bay 1"]);
  assert.equal(equipmentStatus(ctx(), "before", "F2", "16.00").status, "Berhenti, AT-2 kosong");
  assert.ok(capacityEffect(ctx(), "before", "X-9", 1).error);
});
