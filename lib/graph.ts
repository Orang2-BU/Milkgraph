import type { Scenario } from "@/mock/types";

export type NodeKind = "asal" | "mutu" | "proses" | "lot";

export interface GraphNode { id: string; kind: NodeKind; type: string; label: string; source: string; degree: number; r: number; x: number; y: number; vx: number; vy: number; pinned?: boolean }
export interface GraphEdge { source: string; target: string; label: string; planned?: boolean }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }

/** Tipe node scenario dikelompokkan jadi empat jenis supaya legenda dan bentuk node tetap terbaca. */
const KIND_OF: Record<string, NodeKind> = {
  Farm: "asal", RT: "asal",
  LabResult: "mutu", CIPEvent: "mutu",
  Buffer: "proses", Bay: "proses", Thermal: "proses", Separator: "proses", Storage: "proses", Cream: "proses", Mixing: "proses", Premix: "proses", Sterilisasi: "proses", Aseptic: "proses", Filling: "proses",
  Lot: "lot",
};
/** Cincin awal per jenis (pecahan dari bingkai) supaya hasil layout deterministik dan cepat mapan. */
const RING: Record<NodeKind, number> = { proses: 0.1, mutu: 0.3, asal: 0.42, lot: 0.36 };

/** Context graph gaya graphify: node berukuran sesuai jumlah hubungan, ditata simulasi gaya. */
export function buildGraph(graph: Scenario["graph"]): Graph {
  const degree = new Map<string, number>();
  for (const e of graph.edges) for (const id of [e.source, e.target]) degree.set(id, (degree.get(id) ?? 0) + 1);
  const kindOf = (type: string) => KIND_OF[type] ?? "proses";
  const total: Record<NodeKind, number> = { asal: 0, mutu: 0, proses: 0, lot: 0 };
  for (const n of graph.nodes) total[kindOf(n.type)]++;
  const seen: Record<NodeKind, number> = { asal: 0, mutu: 0, proses: 0, lot: 0 };
  const nodes: GraphNode[] = graph.nodes.map(n => {
    const kind = kindOf(n.type);
    const angle = (seen[kind]++ / total[kind]) * Math.PI * 2 + (kind === "lot" ? 0.5 : kind === "mutu" ? 0.2 : 0);
    // Dibulatkan: Math.cos/sin berbeda di digit terakhir antara Node (server) dan browser, yang memicu galat hidrasi.
    const at = (v: number) => Math.round(v * 100) / 100;
    const d = degree.get(n.id) ?? 0;
    return { id: n.id, kind, type: n.type, label: n.label, source: n.source, degree: d, r: 7 + Math.min(d, 6) * 2, x: at(Math.cos(angle) * RING[kind] * 900), y: at(Math.sin(angle) * RING[kind] * 560), vx: 0, vy: 0 };
  });
  const known = new Set(nodes.map(n => n.id));
  const edges = graph.edges.filter(e => known.has(e.source) && known.has(e.target)).map(e => ({ source: e.source, target: e.target, label: e.label, planned: e.planned }));
  return { nodes, edges };
}

/** Node tetangga langsung beserta label relasi dan arahnya. */
export function connections(graph: Graph, id: string): { node: GraphNode; label: string; out: boolean }[] {
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  return graph.edges.flatMap(e => {
    const other = e.source === id ? e.target : e.target === id ? e.source : undefined;
    const node = other ? byId.get(other) : undefined;
    return node ? [{ node, label: e.label, out: e.source === id }] : [];
  });
}

/**
 * Satu langkah fisika: tolak-menolak antar node, pegas di sisi, tarikan ke pusat, redaman, lalu dijepit ke bingkai.
 * `alpha` (1 → 0) meredam gerak. Mengembalikan energi gerak total; kecil berarti sudah mapan.
 */
export function layoutStep(nodes: GraphNode[], edges: GraphEdge[], size: { w: number; h: number }, alpha: number): number {
  const byId = new Map(nodes.map(n => [n.id, n]));
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 0.01) { dx = (i - j) * 0.1; dy = 0.1; d2 = dx * dx + dy * dy; }
      const d = Math.sqrt(d2);
      const push = (3600 * alpha) / d2 + Math.max(0, a.r + b.r + 14 - d) * 0.5;
      const fx = (dx / d) * push, fy = (dy / d) * push;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
  }
  for (const e of edges) {
    const a = byId.get(e.source), b = byId.get(e.target);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const pull = (d - 90) * 0.012 * alpha;
    a.vx += (dx / d) * pull; a.vy += (dy / d) * pull; b.vx -= (dx / d) * pull; b.vy -= (dy / d) * pull;
  }
  let energy = 0;
  const hx = size.w / 2, hy = size.h / 2;
  for (const n of nodes) {
    if (n.pinned) { n.vx = 0; n.vy = 0; continue; }
    n.vx += -n.x * 0.004 * alpha; n.vy += -n.y * 0.004 * alpha;
    n.vx *= 0.82; n.vy *= 0.82;
    n.x = Math.min(hx - n.r - 4, Math.max(-hx + n.r + 4, n.x + n.vx));
    n.y = Math.min(hy - n.r - 4, Math.max(-hy + n.r + 4, n.y + n.vy));
    energy += n.vx * n.vx + n.vy * n.vy;
  }
  return energy;
}

/** Jalankan langkah fisika sampai mapan (dipakai reduced-motion). */
export function settle(nodes: GraphNode[], edges: GraphEdge[], size: { w: number; h: number }, maxSteps = 320) {
  for (let i = 0; i < maxSteps; i++) {
    if (layoutStep(nodes, edges, size, Math.max(0.05, 1 - i / maxSteps)) < 0.02 && i > 60) break;
  }
}
