import type { Asset } from "../../lib/assets";

/**
 * Tab "Perlu diperhatikan" (poin 12): alat dikelompokkan menurut jenis masalahnya, dari yang paling mendesak.
 * Logika murni, dites lewat tests/kondisi-alat-groups.test.mjs.
 */
export const GROUPS = [
  { id: "rusak", title: "Rusak, perlu perbaikan", hint: "Alat berhenti karena kerusakan. Pantau tiket perbaikannya.", match: /breakdown|rusak/i },
  { id: "batas", title: "Isi tangki di batas", hint: "Tangki hampir kosong atau hampir penuh. Alat sesudahnya bisa berhenti, atau bongkar RT tertahan.", match: /menipis|kosong|hampir penuh|penuh/i },
  { id: "tertahan", title: "Tertahan menunggu uji", hint: "Isinya belum boleh dipakai sampai hasil uji keluar.", match: /tertahan/i },
  { id: "jeda", title: "Berhenti sementara", hint: "CIP atau ganti format terjadwal. Alat jalan lagi setelah jam selesainya.", match: /cip|ganti format|maintenance/i },
] as const;

export type Group = { id: string; title: string; hint: string; items: Asset[] };

export function groupAttention(assets: Asset[]): Group[] {
  const groups: Group[] = GROUPS.map(g => ({ id: g.id, title: g.title, hint: g.hint, items: [] }));
  const other: Group = { id: "lain", title: "Lainnya", hint: "Kondisi lain yang perlu dicek.", items: [] };
  for (const a of assets) {
    if (a.tone !== "crit" && a.tone !== "warn") continue;
    const i = GROUPS.findIndex(g => g.match.test(a.status));
    (i < 0 ? other : groups[i]).items.push(a);
  }
  const crit = (x: Asset) => (x.tone === "crit" ? 0 : 1);
  return [...groups, other].filter(g => g.items.length).map(g => ({ ...g, items: [...g.items].sort((x, y) => crit(x) - crit(y)) }));
}
