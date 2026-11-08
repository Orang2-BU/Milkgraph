import { scenario } from "@/lib/data";
import { number } from "@/lib/format";
import { asepticTanks, fillers, midTanks, UNIT_STATE, type MidTank } from "@/mock/ops";
import type { Tone } from "@/mock/types";

/** Satu alat plant beserta kondisinya saat snapshot. Dipakai Kondisi Alat (tabel) dan Alur (canvas). */
export type Asset = {
  id: string;
  /** Tahap di tabel Kondisi Alat. */
  group: string;
  /** Kolom di canvas Alur. */
  stage: string;
  /** Bentuk ilustrasi di components/trace/equipment.tsx. */
  kind: string;
  status: string;
  tone: Tone;
  note: string;
  href: string;
  /** Sedang mengalirkan susu (bukan kosong, CIP, siaga, atau rusak). */
  active: boolean;
};

export const STAGES = ["Penerimaan", "Susu mentah", "Penyimpanan", "Mixing", "Sterilisasi", "Tangki aseptik", "Filling"];

const MID: Record<MidTank["state"], { label: string; tone: Tone }> = { terisi: { label: "Terisi", tone: "ok" }, kosong: { label: "Kosong", tone: "neutral" }, cip: { label: "CIP", tone: "warn" }, tertahan: { label: "Tertahan", tone: "warn" } };

/** Semua alat dalam urutan alur produksi. Halaman detail tetap /tangki dan /filling. */
export const ASSETS: Asset[] = [
  ...scenario.assets.map(a => ({ id: a.id, group: a.kind === "Bay" ? "Penerimaan" : "Susu mentah", stage: a.kind === "Bay" ? "Penerimaan" : "Susu mentah", kind: a.kind, status: a.status, tone: a.tone, note: `${number(a.fill)} / ${number(a.capacity)} ${a.unit} · ${a.info}`, href: "/tangki", active: a.kind === "Buffer" || a.status.startsWith("Unloading") })),
  ...midTanks.map(t => ({ id: t.id, group: t.group, stage: t.group === "Storage" || t.group === "Cream" ? "Penyimpanan" : "Mixing", kind: t.group, status: MID[t.state].label, tone: MID[t.state].tone, note: t.note, href: "/tangki", active: t.state === "terisi" })),
  ...asepticTanks.map(t => ({ id: t.sterilizer, group: "Sterilisasi", stage: "Sterilisasi", kind: "Sterilisasi", status: UNIT_STATE[t.sterilizerState].label, tone: UNIT_STATE[t.sterilizerState].tone, note: `Ke ${t.id} · ${t.product}`, href: "/filling", active: t.sterilizerState === "jalan" })),
  ...asepticTanks.map(t => {
    const thin = t.planned && t.level < t.capacity * 0.1;
    return { id: t.id, group: "Tangki aseptik", stage: "Tangki aseptik", kind: "Aseptic", status: thin ? "Pasokan menipis" : t.level ? "Terisi" : "Kosong", tone: (thin ? "crit" : t.level ? "ok" : "neutral") as Tone, note: `${number(t.level)} / ${number(t.capacity)} L · melayani ${t.fillers.join(" dan ")}`, href: "/filling", active: t.level > 0 };
  }),
  ...fillers.map(f => ({ id: f.id, group: "Filling", stage: "Filling", kind: "Filling", status: UNIT_STATE[f.state].label, tone: UNIT_STATE[f.state].tone, note: `${f.product} · ${f.note}`, href: "/filling", active: f.state === "jalan" })),
];

/**
 * Jalur pipa antar-alat [asumsi, data simulasi]: disusun dari catatan aset (mis. "ST-3 ke MX-1", "AT-2 melayani F2 dan F4").
 * Pre-processing (thermizer, separator) diringkas ke jalur susu mentah ke penyimpanan.
 */
export const LINKS: [string, string][] = [
  ["Bay 1", "RMT-1"], ["Bay 2", "RMT-2"], ["Bay 3", "RMT-2"], ["Bay 3", "RMT-3"],
  ["RMT-1", "ST-1"], ["RMT-1", "ST-6"], ["RMT-1", "CT-1"], ["RMT-2", "ST-3"], ["RMT-2", "ST-4"], ["RMT-2", "CT-2"], ["RMT-3", "ST-2"], ["RMT-3", "ST-5"], ["RMT-3", "CT-3"],
  ["ST-1", "UHT-1"], ["CT-1", "UHT-1"], ["ST-3", "MX-1"], ["ST-4", "MX-2"], ["PM-3", "MX-2"], ["ST-5", "UHT-4"], ["ST-6", "UHT-5"],
  ["MX-1", "UHT-2"], ["MX-2", "UHT-3"],
  ...asepticTanks.flatMap(t => [[t.sterilizer, t.id] as [string, string], ...t.fillers.map(f => [t.id, f] as [string, string])]),
];

