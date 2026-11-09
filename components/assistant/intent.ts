/**
 * Pengenal maksud "Tanya MilkGraph": TF-IDF dan cosine similarity terhadap contoh kalimat per maksud, tanpa LLM dan tanpa paket.
 * Skor di bawah ambang berarti abstain, jadi asisten tidak menebak. Logika murni, dites lewat tests/assistant.test.mjs.
 */
export type Intent = "kendala" | "status" | "dampak" | "jalur" | "asal" | "sebaran" | "bay" | "antrean" | "upgrade" | "rencana" | "bantuan" | "halaman";

const TRAIN: Record<Intent, string[]> = {
  kendala: ["ada kendala apa di alur susu", "masalah apa yang terjadi sekarang", "alur susu macet di mana", "bottleneck produksi di mana", "apa yang perlu diperhatikan sekarang", "alat mana yang bermasalah", "ada gangguan apa hari ini"],
  status: ["AT-2 kenapa", "bagaimana kondisi F10", "status UHT-2 sekarang", "F2 lagi apa", "keadaan tangki RMT-2", "alat ini kenapa"],
  dampak: ["kalau UHT-2 berhenti apa yang kena", "alat apa yang terdampak kalau F2 mati", "dampaknya kalau AT-2 rusak", "kalau yang itu berhenti", "kalau alat itu mati pengaruhnya ke mana", "apa yang ikut berhenti"],
  jalur: ["susu ke F2 lewat mana", "jalur susu menuju AT-2", "F4 dipasok dari mana", "aliran susu ke UHT-2 lewat alat apa", "rute susu sampai F2"],
  asal: ["FG-1013-07 berasal dari mana", "asal lot FG-1013-07", "lot ini dari RT dan farm mana", "susu lot FG-1013-07 datang dari farm apa", "telusuri asal lot"],
  sebaran: ["lot apa saja yang mengandung susu RT-04", "RT-04 masuk ke lot apa", "susu RT-04 dipakai di mana", "lot mana yang terdampak RT-04", "sebaran susu RT-04"],
  bay: ["kenapa Bay 2 tidak bisa dipakai", "Bay 2 kenapa tidak bisa bongkar", "kapan Bay 2 selesai CIP", "Bay 2 bisa dipakai jam berapa"],
  antrean: ["truk mana yang paling lama menunggu", "antrean truk sekarang bagaimana", "RT mana yang mendekati batas holding time", "berapa truk yang antre", "truk yang belum bongkar", "antrean tes lab"],
  upgrade: ["alat apa yang perlu diupgrade", "upgrade mana yang paling menambah produksi", "mesin mana yang sebaiknya dinaikkan kapasitasnya", "rekomendasi upgrade alat", "cara menambah produksi"],
  rencana: ["rekomendasi solver apa", "rencana shift ini layak tidak", "constraint apa yang dilanggar", "solver merekomendasikan apa", "apa isi rekomendasi rencana", "keputusan rencana sudah disetujui belum", "kenapa antrean diubah"],
  bantuan: ["kamu bisa apa", "bisa bantu apa saja", "halo", "hai selamat siang", "cara pakai asisten ini", "siapa kamu", "terima kasih"],
  halaman: ["ringkas halaman ini", "ada apa di halaman ini", "yang penting di sini apa", "jelaskan halaman ini", "halaman ini tentang apa"],
};

const SYNONYMS: Record<string, string> = {
  mengapa: "kenapa", knp: "kenapa", gimana: "bagaimana", macet: "kendala", tersendat: "kendala", gangguan: "kendala", masalah: "kendala", bermasalah: "kendala", bottleneck: "kendala", hambatan: "kendala",
  truck: "truk", tanker: "truk", nunggu: "menunggu", antri: "antrean", antre: "antrean", ngantri: "antrean", mati: "berhenti", rusak: "berhenti", stop: "berhenti", terdampak: "dampak", dampaknya: "dampak", kena: "dampak", pengaruhnya: "dampak",
  asalnya: "asal", berasal: "asal", datangnya: "datang", dipasok: "lewat", rute: "jalur", aliran: "jalur", diupgrade: "upgrade", mesin: "alat", ga: "tidak", gak: "tidak", nggak: "tidak", engga: "tidak", tdk: "tidak", merekomendasikan: "rekomendasi", dipakai: "pakai", memakai: "pakai", bantu: "bantuan",
};
const STOP = new Set(["yang", "di", "ke", "dan", "itu", "ini", "ya", "dong", "sih", "lagi", "saja", "aja", "ada", "untuk", "buat", "dari", "apa", "mana", "sekarang", "kalau", "kalo", "tolong"]);
const KEEP_MARKERS: [RegExp, string][] = [[/\bfg-\d+-\d+\b/g, " kodelot "], [/\brt-?\d+\b/g, " kodert "], [/\b(?:bay)\s?\d\b/g, " kodebay "], [/\b(?:at|uht|st|ct|mx|pm|rmt|th|sp)-?\d+\b|\bf\d{1,2}\b/g, " kodealat "]];

export function tokens(text: string) {
  let t = text.toLowerCase();
  for (const [re, mark] of KEEP_MARKERS) t = t.replace(re, mark);
  return t.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w && !STOP.has(w)).map(w => SYNONYMS[w] ?? w);
}

const examples = (Object.entries(TRAIN) as [Intent, string[]][]).flatMap(([intent, list]) => list.map(s => ({ intent, words: tokens(s) })));
const df = new Map<string, number>();
for (const e of examples) for (const w of new Set(e.words)) df.set(w, (df.get(w) ?? 0) + 1);
const idf = (w: string) => Math.log(1 + examples.length / (df.get(w) ?? 0));

function vector(words: string[]) {
  const v = new Map<string, number>();
  for (const w of words) if (df.has(w)) v.set(w, (v.get(w) ?? 0) + idf(w));
  return v;
}
const size = (v: Map<string, number>) => Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0));
const trained = examples.map(e => ({ intent: e.intent, v: vector(e.words) }));

/** Ambang kecocokan; di bawah ini asisten mengaku tidak tahu. */
const THRESHOLD = 0.34;

export function classify(text: string): { intent: Intent | null; score: number } {
  const q = vector(tokens(text));
  const qSize = size(q);
  if (!qSize) return { intent: null, score: 0 };
  let best: Intent | null = null, score = 0;
  for (const e of trained) {
    let dot = 0;
    for (const [w, x] of q) dot += x * (e.v.get(w) ?? 0);
    const sim = dot / (qSize * (size(e.v) || 1));
    if (sim > score) { score = sim; best = e.intent; }
  }
  return score >= THRESHOLD ? { intent: best, score } : { intent: null, score };
}
