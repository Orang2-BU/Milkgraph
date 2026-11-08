import { test } from "node:test";
import assert from "node:assert/strict";
import { capacityRoom, rankUpgrades } from "../components/rencana/recommend.ts";

// Potongan data Lini Filling (mock/ops.ts): pasokan aseptic tank dan kebutuhan mesin filling dalam L/jam.
const tanks = [
  { id: "AT-1", sterilizer: "UHT-1", sterilizerState: "jalan", inflow: { before: 6900, after: 6900 }, fillers: ["F1", "F3"] },
  { id: "AT-2", sterilizer: "UHT-2", sterilizerState: "jalan", inflow: { before: 6990, after: 8540 }, fillers: ["F2", "F4"] },
  { id: "AT-3", sterilizer: "UHT-3", sterilizerState: "cip", inflow: { before: 0, after: 0 }, fillers: ["F5", "F6"] },
];
const fillers = [
  { id: "F1", state: "jalan", litres: 6550 }, { id: "F3", state: "siaga", litres: 0 },
  { id: "F2", state: "jalan", litres: 6400 }, { id: "F4", state: "jalan", litres: 1890 },
  { id: "F5", state: "cip", litres: 0 }, { id: "F6", state: "cip", litres: 0 },
];

test("pasokan kurang: UHT-nya perlu naik sebesar kekurangannya, mesin filling tidak disarankan", () => {
  const { picks, skips } = rankUpgrades(tanks, fillers);
  assert.deepEqual({ ...picks[0], reason: undefined }, { id: "UHT-2", line: "AT-2", from: 6990, gain: 1300, pct: 19, reason: undefined }); // 8.290 - 6.990
  assert.ok(skips.some(s => s.id === "F2") && skips.some(s => s.id === "F4"));
});

test("pasokan lebih: mesin filling bisa naik sampai sisa pasokan habis", () => {
  const { picks, skips } = rankUpgrades(tanks, fillers);
  const f1 = picks.find(p => p.id === "F1");
  assert.equal(f1.gain, 350);                  // 6.900 - 6.550
  assert.equal(f1.pct, 6);
  assert.ok(skips.some(s => s.id === "UHT-1"));
});

test("jalur yang tidak jalan dilewati; urutan dari tambahan terbesar", () => {
  const { picks } = rankUpgrades(tanks, fillers);
  assert.ok(!picks.some(p => p.id === "UHT-3"));
  assert.deepEqual(picks.map(p => p.id), ["UHT-2", "F1"]);
});

test("atur kapasitas: tambahan yang terpakai jalurnya, dan alasan bila tidak ada", () => {
  assert.deepEqual({ ...capacityRoom(tanks, fillers, "UHT-2"), why: undefined }, { from: 6990, room: 1300, line: "AT-2", why: undefined });
  assert.equal(capacityRoom(tanks, fillers, "F1").room, 350);
  assert.equal(capacityRoom(tanks, fillers, "F2").room, 0);
  assert.match(capacityRoom(tanks, fillers, "F2").why, /AT-2.*kurang/);
  assert.equal(capacityRoom(tanks, fillers, "UHT-3").room, 0);   // sedang CIP
  assert.equal(capacityRoom(tanks, fillers, "ST-3"), null);      // tangki: belum ada laju L/jam
});
