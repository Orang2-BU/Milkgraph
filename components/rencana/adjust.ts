import type { Limits } from "../../lib/rules";

/** Pengaturan rencana per alat di tab Alur rencana (poin 9). Logika murni, dites lewat tests/rencana-adjust.test.mjs. */
/** upgrade: kenaikan kapasitas dalam persen; upgradeTo: kapasitas baru (L/jam) yang diisi planner, untuk label. */
export type Adjust = { upgrade?: number; upgradeTo?: number; maintenance?: { start: string; minutes: number } };
export type Adjustments = Record<string, Adjust>;

const SCHEDULED = new Set(["Bay 1", "Bay 2", "Bay 3", "F1", "F2", "F4"]);

/**
 * Apa yang terjadi di alur saat alat diatur. Alat di luar daftar ini tetap boleh diatur dan statusnya ikut berubah,
 * tapi efeknya ke alat lain belum dimodelkan dan ditandai begitu di UI.
 */
export function effectNote(id: string, kind: "upgrade" | "maintenance") {
  if (kind === "upgrade") return id === "UHT-2" ? "Batas transfer UHT-2 ke AT-2 naik. Bila cukup, AT-2 terisi tepat waktu dan F2/F4 tidak berhenti." : null;
  return SCHEDULED.has(id) ? "Masuk ke jadwal rencana. Bongkar atau produksi yang terkena ikut terlihat di alur pada jam itu." : null;
}

export const isModelled = (id: string, a: Adjust) => Boolean((a.upgrade && effectNote(id, "upgrade")) || (a.maintenance && effectNote(id, "maintenance")));

/** Batas constraint setelah pengaturan: hanya upgrade UHT-2 yang mengubah batas; maintenance masuk lewat jadwal. */
export function applyToLimits(base: Limits, adj: Adjustments): Limits {
  const uht = adj["UHT-2"]?.upgrade;
  return uht ? { ...base, maxTransfer: Math.round(base.maxTransfer * (1 + uht / 100)) } : base;
}

/** Label singkat di kartu alat. */
export function badgeOf(a: Adjust) {
  return [a.upgrade && (a.upgradeTo ? `Kapasitas ${new Intl.NumberFormat("id-ID").format(a.upgradeTo)} L/jam` : `Upgrade +${a.upgrade}%`), a.maintenance && `Maintenance ${a.maintenance.start}, ${a.maintenance.minutes} menit`].filter(Boolean).join(" · ") || undefined;
}
