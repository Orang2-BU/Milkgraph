import type { Adjust } from "./adjust.ts";
import type { View } from "./projection.ts";
import { affectedPath, bestMaintenance, capacityEffect, checkPlan, equipmentStatus, type ToolCtx } from "./plan-tools.ts";
import { capacityRoom } from "./recommend.ts";

/**
 * Penjawab statis "Tanya rencana": membaca maksud pertanyaan dengan kata kunci, memanggil alat hitung yang sama dengan Alur
 * rencana, lalu merangkai jawabannya. Tanpa LLM; bisa diganti chat AI nanti dengan alat hitung yang sama.
 * Logika murni, dites lewat tests/rencana-answer.test.mjs.
 */
export type Proposal = { id: string; adjust: Adjust; reason: string };
export type Reply = { reply: string; proposals: Proposal[] };

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(Math.round(n));
const norm = (s: string) => s.toLowerCase().replace(/[\s-]/g, "");

/** Kode alat yang disebut di pertanyaan ("bay1", "UHT 2", "f10"); yang terpanjang dulu supaya F10 tidak terbaca F1. */
export function findAsset(ids: string[], text: string) {
  const t = text.toLowerCase();
  const pattern = (id: string) => new RegExp(`(^|[^a-z0-9])${id.toLowerCase().split(/[\s-]+/).join("[\\s-]?")}(?![0-9])`);
  return [...ids].sort((a, b) => norm(b).length - norm(a).length).find(id => pattern(id).test(t));
}

export function answer(ctx: ToolCtx, view: View, question: string, defaults: { alat: string; durasi: number }): Reply {
  const q = question.toLowerCase();
  const alat = findAsset(ctx.assets.map(a => a.id), question) ?? defaults.alat;
  const menit = Number(q.match(/(\d+)\s*(menit|mnt|m\b)/)?.[1]) || defaults.durasi;
  const jam = q.match(/(\d{1,2})[.:](\d{2})/);
  const versi = view === "before" ? "rencana awal" : "rekomendasi solver";

  if (/maint|perawatan|servis|perbaik/.test(q)) {
    const r = bestMaintenance(ctx, view, alat, [15, 30, 45, 60, 90].includes(menit) ? menit : 30);
    if ("error" in r) return { reply: r.error!, proposals: [] };
    if (!("terbaik" in r) || !r.terbaik) return { reply: `${alat}: ${r.catatan}`, proposals: [] };
    const best = r.terbaik[0];
    const clash = r.semua_bentrok.length ? ` Jam mulai yang bentrok: ${r.semua_bentrok.join(", ")}.` : " Tidak ada jam yang bentrok.";
    const effect = best.tambahan_pelanggaran ? `pelanggaran naik jadi ${best.dilanggar} dari 6` : `pelanggaran tetap ${best.dilanggar} dari 6`;
    return {
      reply: `${alat} paling aman dimaintenance pukul ${best.mulai}-${best.selesai} (${r.durasi_menit} menit) di ${versi}. ${best.bentrok.length ? `Masih kena ${best.bentrok.join(", ")}` : "Tidak ada bongkar atau produksi yang kena"}, ${effect}.${clash} [simulasi]`,
      proposals: [{ id: alat, adjust: { maintenance: { start: best.mulai, minutes: r.durasi_menit } }, reason: `Jam paling sedikit bentrok untuk ${r.durasi_menit} menit.` }],
    };
  }

  if (/kapasitas|upgrade|naik|tambah|percepat/.test(q)) {
    const room = capacityRoom(ctx.tanks, ctx.fillers, alat);
    if (!room) return { reply: `Laju ${alat} (L/jam) belum ada di data, jadi kapasitasnya belum bisa dihitung. Coba UHT atau mesin filling.`, proposals: [] };
    const litres = Number(q.match(/(\d[\d.]*)\s*(l\b|l\/|liter)/)?.[1]?.replace(/\./g, ""));
    const pct = Number(q.match(/(\d+(?:[.,]\d+)?)\s*%/)?.[1]?.replace(",", "."));
    const target = litres > 0 ? litres : pct > 0 ? room.from * (1 + pct / 100) : room.from + room.room;
    if (target <= room.from) return { reply: `${alat} sekarang ${fmt(room.from)} L/jam. ${room.why || "Jalurnya tidak butuh tambahan kapasitas."} Upgrade tidak menambah produksi.`, proposals: [] };
    const r = capacityEffect(ctx, view, alat, Math.round(target));
    if (!("tambahan_terpakai" in r) || r.tambahan_terpakai === undefined) return { reply: `${alat}: ${"catatan" in r ? r.catatan : "belum bisa dihitung."}`, proposals: [] };
    const waste = r.tidak_terpakai ? ` Sisa ${fmt(r.tidak_terpakai)} L/jam tidak terpakai.` : "";
    const change = r.pelanggaran_sesudah !== r.pelanggaran_sebelum ? ` Pelanggaran di ${versi} turun dari ${r.pelanggaran_sebelum} jadi ${r.pelanggaran_sesudah}.` : ` Pelanggaran di ${versi} tetap ${r.pelanggaran_sesudah}.`;
    return {
      reply: `${alat} dari ${fmt(r.kapasitas_sekarang)} ke ${fmt(r.kapasitas_baru)} L/jam. Yang terpakai jalur ${r.jalur}: +${fmt(r.tambahan_terpakai)} L/jam, sekitar +${fmt(r.tambahan_per_shift_8_jam)} L per shift.${waste}${change}${r.alasan_batas && !r.tambahan_terpakai ? ` ${r.alasan_batas}` : ""} [simulasi]`,
      proposals: r.tambahan_terpakai > 0 ? [{ id: alat, adjust: { upgrade: (r.kapasitas_baru - r.kapasitas_sekarang) / r.kapasitas_sekarang * 100, upgradeTo: r.kapasitas_baru }, reason: `Tambahan terpakai +${fmt(r.tambahan_terpakai)} L/jam.` }] : [],
    };
  }

  if (/jalur|terdampak|dampak|berhenti|mati|rusak/.test(q)) {
    const r = affectedPath(ctx, alat);
    if ("error" in r) return { reply: r.error!, proposals: [] };
    const after = r.sesudahnya?.length ? r.sesudahnya.join(", ") : "tidak ada";
    return { reply: `Kalau ${alat} berhenti, yang ikut tertahan sesudahnya: ${after}. Pasokan ke ${alat} datang dari ${r.sebelumnya?.length ? r.sebelumnya.join(", ") : "tidak ada"}; alat itu bisa penuh atau menunggu. [asumsi jalur pipa]`, proposals: [] };
  }

  if (jam && /status|kondisi|jam|pukul/.test(q)) {
    const time = `${jam[1].padStart(2, "0")}.${jam[2]}`;
    const r = equipmentStatus(ctx, view, alat, time);
    if ("error" in r) return { reply: r.error!, proposals: [] };
    return { reply: `${alat} pukul ${time} di ${versi}: ${r.status}.${"catatan" in r && r.catatan ? ` ${r.catatan}` : ""}`, proposals: [] };
  }

  if (/langgar|constraint|masalah|kenapa|layak|cek/.test(q)) {
    const r = checkPlan(ctx, view);
    if (!r.dilanggar) return { reply: `${versi[0].toUpperCase()}${versi.slice(1)} layak: 0 dari 6 constraint dilanggar.${r.kejadian.length ? ` Yang perlu dipantau: ${r.kejadian.map(k => `${k.jam} ${k.teks}`).join("; ")}.` : ""}`, proposals: [] };
    return { reply: `${versi[0].toUpperCase()}${versi.slice(1)} melanggar ${r.dilanggar} dari 6 constraint. ${r.constraint_gagal.map(c => c.text).join(" ")}${r.kejadian.length ? ` Kejadiannya: ${r.kejadian.map(k => `${k.jam} ${k.teks}`).join("; ")}.` : ""}`, proposals: [] };
  }

  return { reply: "Aku bisa menjawab soal waktu maintenance terbaik, efek kapasitas, jalur yang terdampak, status alat pada jam tertentu, dan constraint yang dilanggar. Contoh: \"maintenance F2 45 menit kapan?\" atau \"UHT-2 naik ke 8.300 L/jam\".", proposals: [] };
}
