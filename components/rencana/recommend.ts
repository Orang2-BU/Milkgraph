import type { AsepticTank, Filler } from "../../mock/ops";

/**
 * Rekomendasi upgrade (poin 10): di tiap jalur UHT ke aseptic tank ke mesin filling, bandingkan pasokan dan kebutuhan
 * (L/jam, sama dengan halaman Lini Filling). Yang membatasi jalur itulah yang layak di-upgrade:
 * pasokan kurang berarti UHT-nya perlu naik sebesar kekurangannya; pasokan lebih berarti mesin filling-nya bisa naik
 * sampai sisa pasokan habis. Semua angka turunan data, tanpa persen karangan. Logika murni, dites lewat
 * tests/rencana-recommend.test.mjs.
 */
export type Pick = { id: string; line: string; from: number; gain: number; pct: number; reason: string };
export type Skip = { id: string; reason: string };

export function rankUpgrades(tanks: AsepticTank[], fillers: Filler[]) {
  const picks: Pick[] = [];
  const skips: Skip[] = [];
  for (const t of tanks) {
    const running = t.fillers.map(id => fillers.find(f => f.id === id)).filter((f): f is Filler => !!f && f.state === "jalan");
    if (t.sterilizerState !== "jalan" || !running.length) continue;
    const supply = t.inflow.before;
    const need = running.reduce((s, f) => s + f.litres, 0);
    const names = running.map(f => f.id).join(" dan ");
    if (supply < need) {
      const gain = need - supply;
      picks.push({ id: t.sterilizer, line: t.id, from: supply, gain, pct: Math.ceil(gain / supply * 100),
        reason: `${t.id} butuh ${fmt(need)} L/jam untuk ${names}, tapi ${t.sterilizer} hanya memasok ${fmt(supply)} L/jam. Kalau naik ${fmt(gain)} L/jam, ${names} tidak kekurangan susu lagi.` });
      for (const f of running) skips.push({ id: f.id, reason: `Pasokan ${t.id} sudah kurang, jadi ${f.id} yang lebih cepat hanya membuat tangki lebih cepat kosong.` });
    } else {
      const gain = supply - need;
      for (const f of running) {
        if (gain > 0) picks.push({ id: f.id, line: t.id, from: f.litres, gain, pct: Math.ceil(gain / f.litres * 100),
          reason: `${t.sterilizer} memasok ${fmt(supply)} L/jam, sedangkan ${names} baru memakai ${fmt(need)} L/jam. ${f.id} bisa naik sampai sisa ${fmt(gain)} L/jam itu habis.` });
      }
      skips.push({ id: t.sterilizer, reason: `Pasokan ${t.sterilizer} sudah lebih dari yang dipakai ${names}. Upgrade tidak menambah produksi.` });
    }
  }
  return { picks: picks.sort((a, b) => b.gain - a.gain), skips };
}

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

/**
 * Dasar atur kapasitas satu alat di panel Alur rencana (poin 16): kapasitas sekarang (`from`, L/jam) dan berapa tambahan yang
 * benar-benar terpakai jalurnya (`room`). Di atas `room`, kapasitas ekstra tidak menambah produksi. null bila datanya belum ada
 * (mis. tangki dan bay tidak punya laju L/jam di data).
 */
export function capacityRoom(tanks: AsepticTank[], fillers: Filler[], id: string) {
  const t = tanks.find(x => x.sterilizer === id || x.fillers.includes(id));
  if (!t) return null;
  const running = t.fillers.map(f => fillers.find(x => x.id === f)).filter((f): f is Filler => !!f && f.state === "jalan");
  const supply = t.inflow.before, need = running.reduce((s, f) => s + f.litres, 0);
  if (id === t.sterilizer) {
    if (t.sterilizerState !== "jalan" || !running.length) return { from: supply, room: 0, line: t.id, why: `${id} atau mesin filling di jalur ${t.id} sedang tidak jalan.` };
    return { from: supply, room: Math.max(0, need - supply), line: t.id, why: supply >= need ? `Pasokan ${id} sudah cukup untuk ${running.map(f => f.id).join(" dan ")}.` : "" };
  }
  const f = fillers.find(x => x.id === id);
  if (!f || f.state !== "jalan" || t.sterilizerState !== "jalan") return { from: f?.litres ?? 0, room: 0, line: t.id, why: `${id} sedang tidak jalan.` };
  return { from: f.litres, room: Math.max(0, supply - need), line: t.id, why: supply <= need ? `Pasokan ${t.id} dari ${t.sterilizer} sudah kurang.` : "" };
}
