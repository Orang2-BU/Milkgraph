import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { queueLayout, truckLine } from "../components/receiving/queue-layout.ts";

const { tankers } = JSON.parse(readFileSync(new URL("../mock/scenario.json", import.meta.url), "utf8"));
const bays = [{ id: "Bay 1", status: "Unloading RT-23", tone: "ok", note: "" }, { id: "Bay 2", status: "CIP", tone: "warn", note: "" }, { id: "Bay 3", status: "Unloading RT-25", tone: "ok", note: "" }];
const at = { "RT-23": "Bay 1", "RT-25": "Bay 3" };

test("setiap RT di data dapat tempat di tahapnya; yang dalam perjalanan jadi truk samar", () => {
  const { slots, zones } = queueLayout(tankers, 4, bays, at);
  assert.equal(slots.filter(s => !s.ghost).length, tankers.length);
  assert.equal(slots.filter(s => s.ghost).length, 4);
  assert.equal(slots.find(s => s.id === "RT-23").bay, "Bay 1");
  assert.equal(slots.find(s => s.id === "RT-26").zone, "Released");
  assert.equal(zones.find(z => z.id === "Released").tone, "crit");          // RT-26 mendekati batas holding time
  assert.deepEqual(zones.map(z => z.x), [...zones.map(z => z.x)].sort((a, b) => a - b)); // urut kiri ke kanan
});

test("truk di satu tahap tidak bertumpuk; Bay 2 yang CIP tanpa truk", () => {
  const { slots } = queueLayout(tankers, 4, bays, at);
  const lab = slots.filter(s => s.zone === "Lab test").map(s => s.z);
  assert.equal(new Set(lab).size, 3);
  assert.ok(!slots.some(s => s.bay === "Bay 2"));
});

test("label truk sesuai tahap", () => {
  assert.equal(truckLine(tankers.find(t => t.id === "RT-26")), "Tunggu bay 24 mnt · umur 9j 20m");
  assert.equal(truckLine(tankers.find(t => t.id === "RT-24")), "Tunggu lab 61 mnt");
});
