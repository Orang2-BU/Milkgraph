import type { Block, Check, Plan } from "../mock/types";

/**
 * Batas constraint yang bisa diubah planner di halaman Constraint, mengikuti enam "Configuration Constraint" Greenfields.
 * Semua nilai default berlabel [asumsi] sampai divalidasi mentor.
 */
export interface Limits {
  maxTransfer: number; starvationTol: number;
  maintenanceBay3: boolean;
  holdingMin: number; bufferMaxMin: number;
  cipBuffer: number; breakdownF1: boolean;
  tankMax: number;
  changeoverMax: number;
}
export const DEFAULT_LIMITS: Limits = { maxTransfer: 9_000, starvationTol: 20, maintenanceBay3: false, holdingMin: 630, bufferMaxMin: 1_080, cipBuffer: 0, breakdownF1: false, tankMax: 95, changeoverMax: 2 };
export type ConstraintId = "flow" | "maintenance" | "holding" | "cip" | "tank" | "changeover";
type View = "before" | "after";

/** Menit sejak 13.00 (awal horizon Gantt). Snapshot 14.42 = 102. */
const NOW = 102;
/**
 * Fakta skenario yang tidak terbaca dari blok Gantt, sama untuk rencana shift dan what-if CIP molor:
 * umur susu RT-26 saat snapshot dan jam selesai bongkarnya, laju transfer UHT-2 yang dibutuhkan untuk mengisi AT-2,
 * umur susu tertua di RMT-2 saat masuk thermal, dan puncak level Raw Milk Buffer.
 */
const RT26_AGE = 560;
const FACTS: Record<View, { finish: number; transfer: number; bufferAge: number; tankPeak: number }> = {
  before: { finish: 195, transfer: 10_200, bufferAge: 970, tankPeak: 91 },
  after: { finish: 170, transfer: 8_540, bufferAge: 905, tankPeak: 94 },
};
const MAINTENANCE = { bay: "Bay 3", start: 180, end: 210 };
const BREAKDOWN = { line: "Filling F1", start: 210, end: 240 };
/** Matriks SOP changeover (menit) per transisi produk [asumsi], sama dengan halaman Lini Filling. */
export const SOP_CHANGEOVER: Record<string, number> = { "UHT Full Cream 1 L>UHT Cokelat 200 ml": 35, "UHT Full Cream 1 L>UHT Stroberi 200 ml": 40, "UHT Cokelat 200 ml>UHT Full Cream 1 L": 45, "UHT Cokelat 200 ml>UHT Stroberi 200 ml": 25, "UHT Stroberi 200 ml>UHT Full Cream 1 L": 50, "UHT Stroberi 200 ml>UHT Cokelat 200 ml": 30 };
const LINES = ["Filling F1", "Filling F2", "Filling F4"];

const clock = (offset: number) => `${13 + Math.floor(offset / 60)}.${String(offset % 60).padStart(2, "0")}`;
const hours = (minutes: number) => `${Math.floor(minutes / 60)}j ${String(minutes % 60).padStart(2, "0")}m`;
const litres = (n: number) => `${new Intl.NumberFormat("id-ID").format(n)} L/jam`;
const rt = (b: Block) => b.label.replace(/ bentrok CIP$/, "");
const overlaps = (b: Block, start: number, end: number) => b.start < end && b.end > start;
const line = (resource: string) => resource.replace("Filling ", "");

/** Sisa menit sebelum batas holding time RT-26 tercapai, dihitung dari snapshot. */
export const holdingLeft = (limits: Limits) => limits.holdingMin - RT26_AGE;
/** Jeda pasokan terpanjang di satu lini filling (AT-2 melayani F2 dan F4, jadi keduanya berhenti bersamaan). */
export const starvation = (blocks: Block[]) => Math.max(0, ...LINES.map(l => blocks.filter(b => b.resource === l && b.type === "starvation").reduce((sum, b) => sum + b.end - b.start, 0)));

/** Uji enam constraint pada satu tampilan rencana. Ini aturan sederhana untuk mockup, bukan solver CP-SAT. */
export function evaluate(plan: Plan, view: View, limits: Limits): Record<ConstraintId, Check> {
  const blocks = plan[view];
  const fact = FACTS[view];
  const unloads = blocks.filter(b => b.type === "unload" || b.type === "violation");

  const gaps = blocks.filter(b => b.type === "starvation");
  const starved = starvation(blocks);
  const stopped = [...new Set(gaps.map(b => line(b.resource)))].join(" dan ");
  const rateOk = fact.transfer <= limits.maxTransfer;
  const flow: Check = rateOk && starved <= limits.starvationTol
    ? { ok: true, text: `UHT-2 ke AT-2 butuh ${litres(fact.transfer)}, dalam batas transfer ${litres(limits.maxTransfer)}. ${starved ? `Jeda ${stopped} ${starved} menit, dalam toleransi ${limits.starvationTol} menit [asumsi].` : "Pasokan F2 dan F4 terjaga."}` }
    : { ok: false, text: `${rateOk ? `UHT-2 ke AT-2 butuh ${litres(fact.transfer)}, dalam batas transfer.` : `Untuk mengisi AT-2 tepat waktu, UHT-2 harus mengejar ${litres(fact.transfer)}, melebihi batas transfer ${litres(limits.maxTransfer)}.`} ${starved ? `Pasokan ke ${stopped} terputus ${starved} menit mulai ${clock(gaps[0].start)}${starved > limits.starvationTol ? `, melebihi toleransi ${limits.starvationTol} menit` : ""}.` : ""}`.trim() };

  const blocked = limits.maintenanceBay3 ? unloads.filter(b => b.resource === MAINTENANCE.bay && overlaps(b, MAINTENANCE.start, MAINTENANCE.end)) : [];
  const window = `${MAINTENANCE.bay} ${clock(MAINTENANCE.start)}-${clock(MAINTENANCE.end)}`;
  const maintenance: Check = !limits.maintenanceBay3 ? { ok: true, text: "Tidak ada maintenance window di horizon ini." }
    : blocked.length ? { ok: false, text: `${blocked.map(rt).join(", ")} bongkar saat maintenance ${window}.` }
    : { ok: true, text: `Tidak ada bongkar saat maintenance ${window}.` };

  const left = limits.holdingMin - (RT26_AGE + fact.finish - NOW);
  const rt26 = left >= 0
    ? `RT-26 selesai bongkar ${clock(fact.finish)}, sisa ${left} menit sebelum batas ${hours(limits.holdingMin)} [asumsi].`
    : `RT-26 baru selesai bongkar ${clock(fact.finish)}, lewat batas ${hours(limits.holdingMin)} [asumsi] pukul ${clock(NOW + holdingLeft(limits))}.`;
  const bufferOk = fact.bufferAge <= limits.bufferMaxMin;
  const buffer = `Susu tertua di RMT-2 masuk thermal pada umur ${hours(fact.bufferAge)}, batas ${hours(limits.bufferMaxMin)}${bufferOk ? "" : ", terlampaui"}.`;
  const holding: Check = { ok: left >= 0 && bufferOk, text: `${rt26} ${buffer}` };

  const cips = blocks.filter(b => b.type === "cip");
  const clash = unloads.filter(b => b.label.startsWith("RT") && cips.some(c => c.resource === b.resource && overlaps(b, c.start, c.end + limits.cipBuffer)));
  const cipEnd = Math.max(...cips.map(c => c.end)) + limits.cipBuffer;
  const buffered = limits.cipBuffer ? ` + jeda ${limits.cipBuffer} menit` : "";
  const broken = limits.breakdownF1 ? blocks.filter(b => b.resource === BREAKDOWN.line && b.type !== "starvation" && overlaps(b, BREAKDOWN.start, BREAKDOWN.end)) : [];
  const breakdown = broken.length ? ` Breakdown F1 ${clock(BREAKDOWN.start)}-${clock(BREAKDOWN.end)} memotong ${broken.map(b => b.label).join(" dan ")}; jadwal F1 perlu disusun ulang.` : limits.breakdownF1 ? ` Breakdown F1 ${clock(BREAKDOWN.start)}-${clock(BREAKDOWN.end)} tidak memotong jadwal.` : "";
  const cipText = clash.length
    ? clash.map(b => `${rt(b)} dijadwalkan di ${b.resource} ${clock(b.start)}, padahal ${b.resource} CIP sampai ${clock(cipEnd - limits.cipBuffer)}${buffered}.`).join(" ")
    : `Tidak ada bongkar di Bay 2 sebelum CIP selesai ${clock(cipEnd)}${buffered ? " (termasuk jeda)" : ""}.`;
  const cip: Check = { ok: !clash.length && !broken.length, text: cipText + breakdown };

  const tank: Check = { ok: fact.tankPeak <= limits.tankMax, text: `Raw Milk Buffer maksimum ${fact.tankPeak}% dari kapasitas, batas ${limits.tankMax}%. Transfer tank ST-4 siap menerima.` };

  const changes = blocks.filter(b => b.type === "changeover");
  const perLine = Math.max(0, ...LINES.map(l => changes.filter(b => b.resource === l).length));
  const sop = changes.map(b => {
    const run = blocks.filter(x => x.resource === b.resource && x.type === "process");
    const from = run.filter(x => x.end <= b.start).sort((x, y) => y.end - x.end)[0], to = run.filter(x => x.start >= b.end).sort((x, y) => x.start - y.start)[0];
    const need = from && to ? SOP_CHANGEOVER[`${from.label}>${to.label}`] ?? 0 : 0;
    return { block: b, need, ok: b.end - b.start >= need };
  });
  const first = sop[0];
  const changeover: Check = {
    ok: perLine <= limits.changeoverMax && sop.every(c => c.ok),
    text: first
      ? `${changes.length} changeover di ${line(first.block.resource)} pukul ${clock(first.block.start)}, ${first.block.end - first.block.start} menit; ${first.ok ? "memenuhi" : "kurang dari"} SOP ${first.need} menit. Batas ${limits.changeoverMax} changeover per lini per shift.`
      : `Tidak ada changeover. Batas ${limits.changeoverMax} per lini per shift.`,
  };

  return { flow, maintenance, holding, cip, tank, changeover };
}

export const violations = (plan: Plan, view: View, limits: Limits) => Object.values(evaluate(plan, view, limits)).filter(c => !c.ok).length;

export interface Instruction { id: string; role: "receiving" | "supervisor"; text: string; from: string }
/** Instruksi yang lahir saat rekomendasi disetujui: RT yang pindah bay atau jam, dan dampaknya ke pasokan filling. */
export function instructions(plan: Plan): Instruction[] {
  const unloadOf = (view: View, id: string) => plan[view].find(b => (b.type === "unload" || b.type === "violation") && rt(b) === id);
  const moved = plan.after.filter(b => b.type === "unload" && b.label.startsWith("RT")).flatMap(b => {
    const was = unloadOf("before", b.label);
    if (was && was.resource === b.resource && was.start === b.start) return [];
    return [{ id: `${plan.id}:${b.label}`, role: "receiving" as const, text: `${b.label} bongkar di ${b.resource}, ${clock(b.start)} - ${clock(b.end)}`, from: was ? `Semula ${was.resource} ${clock(was.start)}` : "Belum terjadwal di rencana awal" }];
  });
  const [before, after] = [starvation(plan.before), starvation(plan.after)];
  const supply = before > after ? [{ id: `${plan.id}:F2`, role: "supervisor" as const, text: `Filling F2 dan F4 tetap jalan, jeda pasokan AT-2 turun dari ${before} ke ${after} menit`, from: "Rencana awal: F2 dan F4 berhenti menunggu AT-2" }] : [];
  return [...moved.sort((a, b) => a.text.localeCompare(b.text)), ...supply];
}
