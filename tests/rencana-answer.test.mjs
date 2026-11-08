import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_LIMITS, evaluate, transferNeed } from "../lib/rules.ts";
import { answer, findAsset } from "../components/rencana/plan-answer.ts";

const { plans } = JSON.parse(readFileSync(new URL("../mock/scenario.json", import.meta.url), "utf8"));
const ids = ["Bay 1", "Bay 2", "RMT-1", "ST-1", "ST-3", "UHT-2", "AT-2", "F1", "F2", "F4", "F10"];
const ctx = {
  plan: plans[0], adj: {}, limits: DEFAULT_LIMITS, evaluate,
  need: { before: transferNeed("before"), after: transferNeed("after") },
  tanks: [{ id: "AT-2", sterilizer: "UHT-2", sterilizerState: "jalan", inflow: { before: 6990, after: 8540 }, fillers: ["F2", "F4"] }],
  fillers: [{ id: "F2", state: "jalan", litres: 6400 }, { id: "F4", state: "jalan", litres: 1890 }],
  links: [["Bay 1", "RMT-1"], ["RMT-1", "ST-1"], ["ST-1", "UHT-2"], ["UHT-2", "AT-2"], ["AT-2", "F2"], ["AT-2", "F4"]],
  assets: ids.map(id => ({ id, status: "Jalan" })),
};
const ask = (q, view = "before") => answer(ctx, view, q, { alat: "Bay 1", durasi: 30 });

test("kode alat dibaca dari pertanyaan bebas", () => {
  assert.equal(findAsset(ids, "maintenance bay1 kapan"), "Bay 1");
  assert.equal(findAsset(ids, "uht 2 naik"), "UHT-2");
  assert.equal(findAsset(ids, "F10 rusak"), "F10");
  assert.equal(findAsset(ids, "F1 jalan"), "F1");
  assert.equal(findAsset(ids, "halo"), undefined);
});

test("maintenance: jam terbaik, durasi dari teks, dan usulan bisa diterapkan", () => {
  const r = ask("Kapan maintenance F2 terbaik untuk 45 menit?", "after");
  assert.match(r.reply, /^F2 paling aman dimaintenance pukul \d{2}\.\d{2}-\d{2}\.\d{2} \(45 menit\)/);
  assert.equal(r.proposals[0].adjust.maintenance.minutes, 45);
});

test("kapasitas: angka L/jam dari teks, atau kebutuhan jalur bila tidak disebut", () => {
  const r = ask("UHT-2 naik ke 9.000 L/jam");
  assert.match(r.reply, /6\.990 ke 9\.000 L\/jam.*\+1\.300 L\/jam.*Sisa 710.*turun dari 3 jadi 2/);
  assert.equal(r.proposals[0].adjust.upgradeTo, 9000);
  assert.match(ask("berapa kapasitas UHT-2 yang dibutuhkan").reply, /ke 8\.290 L\/jam/);
  assert.equal(ask("F2 dinaikkan kapasitasnya").proposals.length, 0);   // pasokan AT-2 sudah kurang
});

test("jalur terdampak, status jam, constraint, dan jawaban bantuan", () => {
  assert.match(ask("apa yang terdampak kalau UHT-2 berhenti").reply, /AT-2, F2, F4/);
  assert.match(ask("status F2 jam 16.00").reply, /Berhenti, AT-2 kosong/);
  assert.match(ask("kenapa rencana ini melanggar?").reply, /melanggar 3 dari 6/);
  assert.match(ask("halo").reply, /Aku bisa menjawab/);
});
