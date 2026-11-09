import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSpeech } from "../components/assistant/speech.ts";

test("kode alat yang diucapkan jadi kode di data", () => {
  assert.equal(normalizeSpeech("kalau uht dua berhenti apa yang kena"), "kalau UHT-2 berhenti apa yang kena");
  assert.equal(normalizeSpeech("u ha te 2 kenapa"), "UHT-2 kenapa");
  assert.equal(normalizeSpeech("a te dua kenapa"), "AT-2 kenapa");
  assert.equal(normalizeSpeech("at 2 kenapa"), "AT-2 kenapa");
  assert.equal(normalizeSpeech("kenapa bay dua tidak bisa dipakai"), "kenapa Bay 2 tidak bisa dipakai");
  assert.equal(normalizeSpeech("susu ke ef sepuluh lewat mana"), "susu ke F10 lewat mana");
  assert.equal(normalizeSpeech("RT nol empat masuk lot apa"), "RT-04 masuk lot apa");
  assert.equal(normalizeSpeech("rt 26 kenapa"), "RT-26 kenapa");
});

test("kalimat biasa tidak diubah", () => {
  assert.equal(normalizeSpeech("ada dua truk di depan"), "ada dua truk di depan");
  assert.equal(normalizeSpeech("kita bahas satu per satu"), "kita bahas satu per satu");
});
