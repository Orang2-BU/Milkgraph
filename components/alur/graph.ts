import type { Asset } from "../../lib/assets";

/** Logika murni canvas Alur (tanpa React), supaya bisa dites langsung dengan node --test. */

export type FlowEdge = { id: string; source: string; target: string; kind: "flow" | "idle" | "summary"; via?: number };

export const CARD = 150;
const SUB = 172;
const GAP = 48;
const ROW = 148;
const TOP = 56;
const MAX_ROWS = 5;

/**
 * Posisi otomatis: satu kolom per tahap, alat ditumpuk dari atas. Tahap dengan lebih dari MAX_ROWS alat dipecah jadi
 * beberapa sub-kolom supaya canvas tidak memanjang ke bawah. Tahap kosong tetap mendapat kolom agar urutannya konsisten.
 */
export function autoLayout(assets: Asset[], stages: string[]) {
  const pos: Record<string, { x: number; y: number }> = {};
  const columns: { stage: string; x: number; width: number; count: number }[] = [];
  let x = 0;
  for (const stage of stages) {
    const items = assets.filter(a => a.stage === stage);
    const subs = Math.max(1, Math.ceil(items.length / MAX_ROWS));
    items.forEach((a, i) => { pos[a.id] = { x: x + Math.floor(i / MAX_ROWS) * SUB, y: TOP + (i % MAX_ROWS) * ROW }; });
    columns.push({ stage, x, width: subs * SUB - (SUB - CARD), count: items.length });
    x += subs * SUB + GAP;
  }
  return { pos, columns };
}

/**
 * Jalur yang tampil untuk alat yang terlihat. Sambungan langsung: "flow" bila kedua alat aktif, selain itu "idle".
 * Bila alat di antaranya disembunyikan, jalur diringkas jadi satu garis "summary" dengan jumlah alat yang dilewati.
 */
export function visibleEdges(assets: Asset[], links: [string, string][], visible: Set<string>): FlowEdge[] {
  const byId = new Map(assets.map(a => [a.id, a]));
  const out = new Map<string, string[]>();
  for (const [s, t] of links) out.set(s, [...(out.get(s) ?? []), t]);
  const edges: FlowEdge[] = [];
  const seen = new Set<string>();
  for (const [s, t] of links) {
    if (!visible.has(s) || !visible.has(t)) continue;
    seen.add(`${s}>${t}`);
    edges.push({ id: `${s}>${t}`, source: s, target: t, kind: byId.get(s)?.active && byId.get(t)?.active ? "flow" : "idle" });
  }
  for (const s of visible) {
    // BFS lewat alat tersembunyi saja; berhenti di alat terlihat pertama yang ditemui.
    const queue = (out.get(s) ?? []).filter(n => !visible.has(n)).map(n => ({ id: n, hops: 1 }));
    const visited = new Set(queue.map(q => q.id));
    while (queue.length) {
      const { id, hops } = queue.shift()!;
      for (const n of out.get(id) ?? []) {
        if (visible.has(n)) {
          const key = `${s}>${n}`;
          if (!seen.has(key) && n !== s) { seen.add(key); edges.push({ id: `${key}~`, source: s, target: n, kind: "summary", via: hops }); }
        } else if (!visited.has(n)) { visited.add(n); queue.push({ id: n, hops: hops + 1 }); }
      }
    }
  }
  return edges;
}

