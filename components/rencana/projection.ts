import type { Block, Check, Plan } from "../../mock/types";
import type { ConstraintId, Limits } from "../../lib/rules";
import type { Asset } from "../../lib/assets";
import type { Adjustments } from "./adjust";

/**
 * Proyeksi rencana ke alur (poin 9): jadwal rencana + pengaturan alat menjadi status tiap alat pada jam tertentu.
 * Logika murni, dites lewat tests/rencana-projection.test.mjs.
 */
export type View = "before" | "after";
export type PBlock = Omit<Block, "type"> & { type: Block["type"] | "maintenance" };
export const HORIZON = 420;
/** Snapshot operasi yang sedang berjalan (14.42). Pada jam ini alur rencana sama dengan Operasional > Alur (poin 15). */
export const NOW = 102;
export const clock = (o: number) => `${String(13 + Math.floor(o / 60)).padStart(2, "0")}.${String(o % 60).padStart(2, "0")}`;
export const toOffset = (hhmm: string) => { const [h, m] = hhmm.split(".").map(Number); return h * 60 + m - 13 * 60; };

/** Alat yang punya baris di jadwal rencana. */
export const RESOURCE: Record<string, string> = { "Bay 1": "Bay 1", "Bay 2": "Bay 2", "Bay 3": "Bay 3", F1: "Filling F1", F2: "Filling F2", F4: "Filling F4" };
const overlaps = (b: { start: number; end: number }, s: number, e: number) => b.start < e && b.end > s;

/** Jadwal setelah pengaturan (need = laju UHT-2 ke AT-2 yang dibutuhkan versi rencana ini, dari rules.transferNeed): upgrade UHT-2 yang cukup menghapus jeda F2/F4, maintenance jadi blok dan membuat bongkar yang kena bentrok. */
export function projectBlocks(blocks: Block[], need: number, adj: Adjustments, baseTransfer: number): PBlock[] {
  let out: PBlock[] = blocks.map(b => ({ ...b }));
  const up = adj["UHT-2"]?.upgrade;
  if (up && Math.round(baseTransfer * (1 + up / 100)) >= need) {
    out = out.filter(b => !(b.type === "starvation" && (b.resource === "Filling F2" || b.resource === "Filling F4")));
  }
  for (const [id, a] of Object.entries(adj)) {
    const res = RESOURCE[id];
    if (!a.maintenance || !res) continue;
    const s = toOffset(a.maintenance.start), e = s + a.maintenance.minutes;
    out = out.flatMap((b): PBlock[] => {
      if (b.resource !== res || !overlaps(b, s, e)) return [b];
      if (b.type === "unload") return [{ ...b, type: "violation", label: `${b.label} bentrok maintenance` }];
      if (b.type === "process") return [...(b.start < s ? [{ ...b, end: s }] : []), ...(b.end > e ? [{ ...b, start: e }] : [])];
      return [b];
    });
    out.push({ resource: res, label: `Maintenance ${id}`, start: s, end: e, type: "maintenance", source: "" });
  }
  return out;
}

/** 6 constraint pada jadwal yang sudah disesuaikan; bongkar yang bentrok maintenance membuat constraint maintenance gagal. */
type Evaluate = (plan: Plan, view: View, limits: Limits) => Record<ConstraintId, Check>;
export function projectChecks(evaluate: Evaluate, plan: Plan, view: View, blocks: PBlock[], limits: Limits): Record<ConstraintId, Check> {
  const checks = evaluate({ ...plan, [view]: blocks.filter(b => b.type !== "maintenance") as Block[] }, view, limits);
  const clash = blocks.filter(b => b.label.endsWith("bentrok maintenance"));
  if (clash.length) checks.maintenance = { ok: false, text: `${clash.map(b => `${b.label.replace(" bentrok maintenance", "")} di ${b.resource} pukul ${clock(b.start)}`).join(", ")} bentrok dengan maintenance yang dijadwalkan.` };
  return checks;
}

type Status = Pick<Asset, "status" | "tone" | "active">;
const PRIORITY: PBlock["type"][] = ["violation", "starvation", "maintenance", "cip", "changeover", "unload", "process"];

/** Status tiap alat pada jam t. Alat di luar jadwal hanya berubah bila sedang maintenance; selebihnya pakai kondisi snapshot. */
export function statusAt(blocks: PBlock[], t: number, adj: Adjustments): Record<string, Status> {
  const at = (res: string) => blocks.filter(b => b.resource === res && b.start <= t && b.end > t).sort((a, b) => PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type))[0];
  const out: Record<string, Status> = {};
  for (const [id, res] of Object.entries(RESOURCE)) {
    const b = at(res);
    const bay = id.startsWith("Bay");
    out[id] = !b ? (bay ? { status: "Kosong", tone: "neutral", active: false } : { status: "Jalan", tone: "ok", active: true })
      : b.type === "violation" ? { status: b.label.replace(" bentrok maintenance", ", bentrok").replace(" bentrok CIP", ", bentrok CIP"), tone: "crit", active: false }
      : b.type === "starvation" ? { status: "Berhenti, AT-2 kosong", tone: "crit", active: false }
      : b.type === "maintenance" ? { status: "Maintenance", tone: "warn", active: false }
      : b.type === "cip" ? { status: "CIP", tone: "warn", active: false }
      : b.type === "changeover" ? { status: "Ganti format", tone: "warn", active: false }
      : b.type === "unload" ? { status: `Unloading ${b.label}`, tone: "ok", active: true }
      : { status: "Jalan", tone: "ok", active: true };
  }
  // AT-2 mengikuti operasi (pasokan menipis) sampai rencana membuatnya kosong, atau setelah snapshot rencana menjaga pasokannya.
  if (out.F2.status.startsWith("Berhenti")) out["AT-2"] = { status: "Kosong", tone: "crit", active: false };
  else if (t > NOW && !blocks.some(b => b.type === "starvation")) out["AT-2"] = { status: "Terisi", tone: "ok", active: true };
  for (const [id, a] of Object.entries(adj)) {
    if (RESOURCE[id] || !a.maintenance) continue;
    const s = toOffset(a.maintenance.start);
    if (t >= s && t < s + a.maintenance.minutes) out[id] = { status: "Maintenance", tone: "warn", active: false };
  }
  return out;
}

export type Event = { at: number; tone: "crit" | "warn"; text: string };
/** Kejadian penting di jadwal (bentrok, filling berhenti, maintenance), untuk melompat ke jamnya. */
export function events(blocks: PBlock[]): Event[] {
  const out: Event[] = [];
  const stops = new Map<number, PBlock[]>();
  for (const b of blocks) {
    if (b.type === "violation") out.push({ at: b.start, tone: "crit", text: `${b.label} di ${b.resource}` });
    if (b.type === "maintenance") out.push({ at: b.start, tone: "warn", text: `${b.label.replace("Maintenance ", "")} maintenance ${b.end - b.start} menit` });
    if (b.type === "starvation") stops.set(b.start, [...(stops.get(b.start) ?? []), b]);
  }
  for (const [at, list] of stops) out.push({ at, tone: "crit", text: `${list.map(b => b.resource.replace("Filling ", "")).join(" dan ")} berhenti ${list[0].end - list[0].start} menit, AT-2 kosong` });
  return out.sort((a, b) => a.at - b.at);
}
