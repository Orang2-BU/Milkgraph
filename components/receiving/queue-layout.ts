import type { Tanker, Tone } from "../../mock/types";

/**
 * Tata letak Antrean 3D (next phase PDF): RT disusun per tahap dari kiri ke kanan, sama urutannya dengan alur penerimaan.
 * Yang dalam perjalanan tidak punya kode RT di data, jadi tampil sebagai truk samar sejumlah hitungannya.
 * Logika murni, dites lewat tests/receiving-queue.test.mjs.
 */
export type Zone = { id: string; label: string; x: number; note: string; tone: Tone };
export type Slot = { id: string; x: number; z: number; zone: string; ghost?: boolean; bay?: string };
export type BaySlot = { id: string; x: number; z: number; status: string; tone: Tone; note: string };

const GAP = 5.4;
const column = (n: number) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * GAP);

export function queueLayout(tankers: Tanker[], onTheWay: number, bays: { id: string; status: string; tone: Tone; note: string }[], unloadingAt: Record<string, string>) {
  const by = (stage: string) => tankers.filter(t => t.stage === stage);
  const zones: Zone[] = [
    { id: "otw", label: "Dalam perjalanan", x: -24, note: `${onTheWay} RT`, tone: "neutral" },
    { id: "Sampling", label: "Sampling", x: -13, note: `${by("Sampling").length} RT`, tone: "ok" },
    { id: "Lab test", label: "Tunggu tes lab", x: -2, note: `${by("Lab test").length} RT`, tone: by("Lab test").length ? "warn" : "ok" },
    { id: "Released", label: "Siap bongkar", x: 9, note: `${by("Released").length} RT menunggu bay`, tone: by("Released").some(t => t.tone === "crit") ? "crit" : "ok" },
    { id: "Unloading", label: "Bay bongkar", x: 21, note: `${bays.length} bay`, tone: "ok" },
  ];
  const slots: Slot[] = [];
  column(onTheWay).forEach((z, i) => slots.push({ id: `otw-${i + 1}`, x: -24, z, zone: "otw", ghost: true }));
  for (const zone of zones.slice(1, 4)) column(by(zone.id).length).forEach((z, i) => slots.push({ id: by(zone.id)[i].id, x: zone.x, z, zone: zone.id }));
  const baySlots: BaySlot[] = bays.map((b, i) => ({ ...b, x: 21, z: column(bays.length)[i] }));
  for (const t of by("Unloading")) {
    const bay = baySlots.find(b => b.id === unloadingAt[t.id]);
    if (bay) slots.push({ id: t.id, x: bay.x, z: bay.z, zone: "Unloading", bay: bay.id });
  }
  return { zones, slots, bays: baySlots };
}

/** Kalimat singkat di label truk, sesuai tahapnya. */
export function truckLine(t: Tanker) {
  if (t.stage === "Unloading") return `Bongkar · ${new Intl.NumberFormat("id-ID").format(t.volume)} L`;
  if (t.stage === "Released") return `Tunggu bay ${t.wait} mnt · umur ${t.age}`;
  if (t.stage === "Lab test") return `Tunggu lab ${t.wait} mnt`;
  return `Sampling ${t.wait} mnt`;
}
