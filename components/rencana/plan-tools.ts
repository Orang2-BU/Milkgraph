import type { Check, Plan } from "../../mock/types";
import type { AsepticTank, Filler } from "../../mock/ops";
import type { ConstraintId, Limits } from "../../lib/rules";
import type { Adjustments } from "./adjust";
import { applyToLimits } from "./adjust.ts";
import { RESOURCE, clock, events, projectBlocks, projectChecks, statusAt, toOffset, type View } from "./projection.ts";
import { capacityRoom } from "./recommend.ts";

/**
 * Alat hitung untuk chat "Tanya rencana" (poin 17). LLM hanya memilih alat dan merangkai jawaban; semua angka berasal dari
 * fungsi di sini, yang memakai proyeksi yang sama dengan Alur rencana. Logika murni, dites lewat tests/rencana-tools.test.mjs.
 */
export type ToolCtx = {
  plan: Plan;
  adj: Adjustments;
  limits: Limits;
  need: Record<View, number>;
  evaluate: (plan: Plan, view: View, limits: Limits) => Record<ConstraintId, Check>;
  tanks: AsepticTank[];
  fillers: Filler[];
  links: [string, string][];
  assets: { id: string; status: string }[];
};

export const STARTS = ["13.30", "14.00", "14.30", "15.00", "15.30", "16.00", "16.30", "17.00", "17.30", "18.00", "18.30", "19.00"];

function project(ctx: ToolCtx, view: View, adj: Adjustments) {
  const limits = applyToLimits(ctx.limits, adj);
  const blocks = projectBlocks(ctx.plan[view], ctx.need[view], adj, ctx.limits.maxTransfer);
  const checks = projectChecks(ctx.evaluate, ctx.plan, view, blocks, limits);
  return { blocks, failed: Object.entries(checks).filter(([, c]) => !c.ok).map(([id, c]) => ({ id, text: c.text })) };
}

const known = (ctx: ToolCtx, id: string) => ctx.assets.some(a => a.id === id);

export function checkPlan(ctx: ToolCtx, view: View) {
  const { blocks, failed } = project(ctx, view, ctx.adj);
  return { versi: view === "before" ? "rencana awal (FIFO)" : "rekomendasi solver", dilanggar: failed.length, dari: 6, constraint_gagal: failed, kejadian: events(blocks).map(e => ({ jam: clock(e.at), tingkat: e.tone, teks: e.text })) };
}

export function equipmentStatus(ctx: ToolCtx, view: View, id: string, jam: string) {
  if (!known(ctx, id)) return { error: `Alat ${id} tidak ada di data.` };
  const t = toOffset(jam);
  const s = statusAt(project(ctx, view, ctx.adj).blocks, t, ctx.adj)[id];
  return s ? { alat: id, jam, status: s.status, tingkat: s.tone } : { alat: id, jam, status: ctx.assets.find(a => a.id === id)!.status, catatan: "Alat ini tidak ada di jadwal rencana, jadi statusnya mengikuti kondisi operasi pukul 14.42." };
}

/** Jam maintenance yang paling sedikit menambah pelanggaran, dicoba di setiap pilihan jam mulai. */
export function bestMaintenance(ctx: ToolCtx, view: View, id: string, minutes: number) {
  if (!known(ctx, id)) return { error: `Alat ${id} tidak ada di data.` };
  if (!RESOURCE[id]) return { alat: id, catatan: "Alat ini tidak punya baris di jadwal rencana (hanya Bay 1-3, F1, F2, F4), jadi bentroknya belum bisa dihitung. Jadwalkan saat statusnya siaga atau CIP." };
  const base = project(ctx, view, ctx.adj).failed.length;
  const slots = STARTS.map(start => {
    const adj = { ...ctx.adj, [id]: { ...ctx.adj[id], maintenance: { start, minutes } } };
    const { blocks, failed } = project(ctx, view, adj);
    return { mulai: start, selesai: clock(toOffset(start) + minutes), dilanggar: failed.length, tambahan_pelanggaran: failed.length - base, bentrok: blocks.filter(b => b.label.endsWith("bentrok maintenance")).map(b => `${b.label.replace(" bentrok maintenance", "")} pukul ${clock(b.start)}`) };
  });
  const best = [...slots].sort((a, b) => a.dilanggar - b.dilanggar || a.bentrok.length - b.bentrok.length).slice(0, 3);
  return { alat: id, durasi_menit: minutes, versi: view, pelanggaran_tanpa_maintenance: base, terbaik: best, semua_bentrok: slots.filter(s => s.bentrok.length).map(s => s.mulai) };
}

export function capacityEffect(ctx: ToolCtx, view: View, id: string, capacity: number) {
  if (!known(ctx, id)) return { error: `Alat ${id} tidak ada di data.` };
  const room = capacityRoom(ctx.tanks, ctx.fillers, id);
  if (!room) return { alat: id, catatan: "Laju alat ini (L/jam) belum ada di data, jadi efek kapasitasnya belum bisa dihitung." };
  const extra = Math.max(0, capacity - room.from), used = Math.min(extra, room.room);
  const adj = extra ? { ...ctx.adj, [id]: { ...ctx.adj[id], upgrade: extra / room.from * 100, upgradeTo: capacity } } : ctx.adj;
  return {
    alat: id, jalur: room.line, kapasitas_sekarang: room.from, kapasitas_baru: Math.max(capacity, room.from), tambahan: extra,
    tambahan_terpakai: used, tambahan_per_shift_8_jam: used * 8, tidak_terpakai: extra - used, ruang_maksimal: room.room, alasan_batas: room.why || undefined,
    pelanggaran_sebelum: project(ctx, view, ctx.adj).failed.length, pelanggaran_sesudah: project(ctx, view, adj).failed.length,
  };
}

/** Alat yang dilewati susu sebelum dan sesudah alat ini, menurut jalur pipa di data [asumsi]. */
export function affectedPath(ctx: ToolCtx, id: string) {
  if (!known(ctx, id)) return { error: `Alat ${id} tidak ada di data.` };
  const walk = (dir: 0 | 1) => {
    const seen = new Set<string>(), queue = [id];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const l of ctx.links) if (l[1 - dir] === cur && l[dir] !== id && !seen.has(l[dir])) { seen.add(l[dir]); queue.push(l[dir]); }
    }
    return [...seen];
  };
  return { alat: id, sesudahnya: walk(1), sebelumnya: walk(0) };
}
