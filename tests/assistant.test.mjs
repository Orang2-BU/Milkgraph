import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classify } from "../components/assistant/intent.ts";
import { reply, suggestions, thinkingSteps } from "../components/assistant/answer.ts";

const scenario = JSON.parse(readFileSync(new URL("../mock/scenario.json", import.meta.url), "utf8"));
const asset = (id, status, tone, note = "", stage = "Filling") => ({ id, status, tone, note, stage, group: stage, kind: stage, href: "/alur", active: tone === "ok" });
const data = {
  assets: [asset("Bay 2", "CIP", "warn", "32 / 70 mnt"), asset("RMT-2", "Normal", "ok"), asset("MX-1", "Terisi", "ok"), asset("UHT-2", "Jalan", "ok"), asset("AT-2", "Pasokan menipis", "crit", "1.480 / 30.000 L"), asset("F2", "Jalan", "ok"), asset("F4", "Jalan", "ok"), asset("F10", "Breakdown", "crit", "Seal jaw rusak")],
  links: [["Bay 2", "RMT-2"], ["RMT-2", "MX-1"], ["MX-1", "UHT-2"], ["UHT-2", "AT-2"], ["AT-2", "F2"], ["AT-2", "F4"]],
  tankers: scenario.tankers,
  answers: scenario.answers,
  plans: scenario.plans,
  upgrades: [{ id: "UHT-2", line: "AT-2", from: 6990, gain: 1300, pct: 19, reason: "" }],
};
const state = { page: "/alur", user: "Rino Akbar Hanif", roleLabel: "Planner PPIC", roleFocus: "Rencana shift yang layak.", planId: "current", decisions: [], holds: [], labs: {}, adjustText: "", broken: { before: 3, after: 0 } };
const ask = (q, over = {}) => reply(q, data, { ...state, ...over });

test("kalimat bebas yang bukan contoh latih tetap dikenali maksudnya", () => {
  const cases = {
    "ada kendala apa di alur susu?": "kendala",
    "alur susu sekarang lagi macet di mana ya": "kendala",
    "kalau UHT-2 mati apa saja yang kena?": "dampak",
    "susu buat F2 datangnya lewat mana": "jalur",
    "FG-1013-07 itu asalnya dari farm mana?": "asal",
    "RT-04 dipakai di lot apa saja": "sebaran",
    "kenapa bay 2 ga bisa dipakai": "bay",
    "truk mana yang nunggu paling lama": "antrean",
    "mesin mana yang sebaiknya diupgrade": "upgrade",
    "solver merekomendasikan apa": "rencana",
    "kamu bisa bantu apa": "bantuan",
    "AT-2 kenapa": "status",
    "ringkas halaman ini dong": "halaman",
  };
  for (const [q, intent] of Object.entries(cases)) assert.equal(classify(q).intent, intent, q);
});

test("kalimat di luar topik tidak ditebak", () => {
  assert.equal(classify("resep rendang yang enak").intent, null);
  assert.equal(classify("asdf qwer zxcv").intent, null);
  const r = ask("resep rendang yang enak");
  assert.match(r.text, /belum bisa menjawab/i);
  assert.equal(r.links.length, 0);
});

test("kendala menyebut alat kritis dari data dan waktu snapshot", () => {
  const r = ask("ada kendala apa di alur susu?");
  assert.match(r.text, /14\.42/);
  assert.match(r.text, /AT-2 \(Pasokan menipis\)/);
  assert.match(r.text, /F10 \(Breakdown\)/);
  assert.ok(r.links.some(l => l.href === "/kondisi-alat"));
});

test("jalur dan dampak ditelusuri dari sambungan pipa", () => {
  const down = ask("kalau UHT-2 berhenti apa yang kena?");
  assert.match(down.text, /AT-2, F2, F4/);
  assert.equal(down.lastAsset, "UHT-2");
  const up = ask("susu ke F2 lewat mana?");
  assert.match(up.text, /Bay 2/);
  assert.match(up.text, /UHT-2/);
});

test("jawaban mengikuti kondisi sekarang: persetujuan, upgrade, dan hold", () => {
  assert.match(ask("rekomendasi solver apa?").text, /menunggu persetujuan/i);
  const approved = { decisions: [{ plan: "current", status: "approved", note: "", by: "Rino Akbar Hanif", at: "14.47" }] };
  assert.match(ask("rekomendasi solver apa?", approved).text, /disetujui Rino Akbar Hanif pukul 14\.47/);
  assert.match(ask("kenapa bay 2 tidak bisa dipakai?", approved).text, /RT-26 pindah ke Bay 1/);
  const upgraded = ask("rekomendasi solver apa?", { adjustText: "UHT-2 Kapasitas 8.290 L/jam", broken: { before: 2, after: 0 } });
  assert.match(upgraded.text, /UHT-2 Kapasitas 8\.290 L\/jam/);
  assert.match(upgraded.text, /2 dari 6/);
  const hold = { holds: [{ id: "HOLD-01", trigger: "FG-1013-07", status: "diajukan", by: "Sri Lestari", at: "15.00", rt: "RT-04", lots: [], note: "" }] };
  assert.match(ask("RT-04 masuk lot apa?", hold).text, /HOLD-01/);
});

test("pertanyaan lanjutan memakai alat terakhir; tanpa alat, bot bertanya balik", () => {
  const r = reply("kalau yang itu berhenti?", data, { ...state, lastAsset: "UHT-2" });
  assert.match(r.text, /AT-2, F2, F4/);
  assert.match(ask("kalau yang itu berhenti?").text, /alat mana/i);
});

test("saran dan jawaban halaman mengikuti halaman yang dibuka; sapaan mengikuti peran", () => {
  assert.notDeepEqual(suggestions("/receiving"), suggestions("/rencana"));
  assert.equal(suggestions("/receiving").length, 4);
  assert.match(ask("ringkas halaman ini", { page: "/receiving" }).text, /RT/);
  assert.match(ask("kamu bisa apa?").text, /Rino/);
  assert.match(ask("kamu bisa apa?").text, /Planner PPIC/);
});

test("langkah berpikir mengikuti maksud pertanyaan", () => {
  assert.deepEqual(thinkingSteps("truk mana yang paling lama menunggu"), ["Memahami pertanyaan", "Membaca antrean truk", "Menyusun jawaban"]);
  assert.deepEqual(thinkingSteps("resep rendang yang enak"), ["Memahami pertanyaan", "Menyusun jawaban"]);
});
