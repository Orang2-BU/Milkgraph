import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSteps, durationText, parseWindow } from "../components/riwayat/timeline.ts";

const { handoffs } = JSON.parse(readFileSync(new URL("../mock/scenario.json", import.meta.url), "utf8"));

test("rentang waktu dibaca jadi jam mulai dan selesai", () => {
  assert.deepEqual(parseWindow("13 Okt 04.30 - 05.40"), { day: "13 Okt", startText: "04.30", endText: "05.40", start: 270, end: 340 });
  assert.equal(parseWindow("tanpa jam"), null);
});

test("durasi ditulis dalam jam dan menit", () => {
  assert.equal(durationText(70), "1 jam 10 menit");
  assert.equal(durationText(25), "25 menit");
  assert.equal(durationText(480), "8 jam");
});

test("rantai cokelat: jeda antarcatatan dan tahap yang berjalan bersamaan", () => {
  const steps = buildSteps(handoffs);
  assert.equal(steps.length, 7);
  assert.equal(steps[0].duration, 70);
  assert.equal(steps[1].gapBefore, 40);          // 05.40 ke 06.20
  assert.equal(steps[2].gapBefore, 90);          // 06.45 ke 08.15
  assert.equal(steps[6].overlapsPrev, true);     // filling 13.10 mulai sebelum sterilisasi selesai 21.00
});
