import { test } from "node:test";
import assert from "node:assert/strict";
import { groupAttention } from "../components/kondisi-alat/groups.ts";

const a = (id, tone, status) => ({ id, tone, status });
const assets = [
  a("RMT-2", "warn", "Hampir penuh"), a("AT-2", "crit", "Pasokan menipis"), a("F10", "crit", "Breakdown"), a("Bay 2", "warn", "CIP"),
  a("ST-6", "warn", "Tertahan"), a("F8", "warn", "Ganti format"),
  a("F1", "ok", "Jalan"), a("X-1", "warn", "Sensor offline"),
];

test("dikelompokkan per jenis masalah, urut dari yang paling mendesak; di dalam grup yang kritis dulu", () => {
  const groups = groupAttention(assets);
  assert.deepEqual(groups.map(g => [g.id, g.items.map(i => i.id)]), [
    ["rusak", ["F10"]], ["batas", ["AT-2", "RMT-2"]], ["tertahan", ["ST-6"]], ["jeda", ["Bay 2", "F8"]], ["lain", ["X-1"]],
  ]);
});

test("alat yang normal tidak masuk; grup kosong tidak tampil", () => {
  const groups = groupAttention([a("F1", "ok", "Jalan"), a("Bay 2", "warn", "CIP")]);
  assert.deepEqual(groups.map(g => g.id), ["jeda"]);
});
