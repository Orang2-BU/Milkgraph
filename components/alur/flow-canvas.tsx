"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ReactFlow, Background, Controls, MarkerType, type Edge, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2, Minimize2, MousePointer2 } from "lucide-react";
import { Card, Icon } from "@/components/ui";
import { ASSETS, LINKS, STAGES, type Asset } from "@/lib/assets";
import { autoLayout, visibleEdges, CARD } from "./graph";
import { nodeTypes, type AssetNode, type StageNode } from "./flow-nodes";
import { Flow3D } from "./flow-3d";

/**
 * Canvas alur alat produksi yang dipakai bersama: Operasional > Alur (panel info alat) dan Rencana (panel atur alat).
 * Susunan alat selalu mengikuti data plant; yang berbeda hanya panel samping dan label di kartu alat.
 */
export type AsideProps = { asset: Asset; onPick: (id: string) => void; onClose: () => void };
export function FlowCanvas({ aside: Aside, badges = {}, overrides, hint, label, toolbar, mode = "2d", picked: pickedProp, onPickedChange }: {
  /** Alat terpilih dari luar, mis. dropdown Alat di Rencana (poin 16). Tanpa ini canvas menyimpan pilihannya sendiri. */
  picked?: string | null;
  onPickedChange?: (id: string | null) => void;
  /** Poin 14: alur yang sama digambar 2D (React Flow) atau 3D (three.js). */
  mode?: "2d" | "3d";
  aside: ComponentType<AsideProps>;
  badges?: Record<string, string>;
  /** Status alat pengganti snapshot, mis. hasil proyeksi rencana pada jam tertentu. */
  overrides?: Record<string, Partial<Asset>>;
  /** Kontrol tambahan di bawah toolbar, mis. versi rencana dan slider waktu. */
  toolbar?: ReactNode;
  hint: string;
  label: string;
}) {
  const [ownPicked, setOwnPicked] = useState<string | null>(null);
  const picked = pickedProp !== undefined ? pickedProp : ownPicked;
  const setPicked = onPickedChange ?? setOwnPicked;
  const [full, setFull] = useState(false);
  const flow = useRef<ReactFlowInstance<AssetNode | StageNode> | null>(null);
  // Panel samping mempersempit canvas; geser kamera ke alat yang dipilih supaya tidak tertutup.
  const pick = (id: string) => setPicked(id);
  useEffect(() => {
    if (!picked) return;
    const frame = requestAnimationFrame(() => {
      const n = flow.current?.getNode(picked);
      if (n && flow.current) void flow.current.setCenter(n.position.x + CARD / 2, n.position.y + 60, { zoom: flow.current.getZoom(), duration: 300 });
    });
    return () => cancelAnimationFrame(frame);
  }, [picked]);

  const all = useMemo(() => overrides ? ASSETS.map(a => ({ ...a, ...overrides[a.id] })) : ASSETS, [overrides]);
  const visible = all;
  const graph = useMemo(() => {
    const ids = new Set(visible.map(a => a.id));
    const { pos, columns } = autoLayout(visible, STAGES);
    const stages: StageNode[] = columns.map(c => ({ id: `stage-${c.stage}`, type: "stage", position: { x: c.x, y: 0 }, style: { width: Math.max(c.width, CARD) }, data: { label: c.stage, count: c.count }, selectable: false, draggable: false, focusable: false }));
    const tone = new Map(all.map(a => [a.id, a.tone]));
    const raw = visibleEdges(all, LINKS, ids);
    const edges: Edge[] = raw.map(e => ({
      // Garis ke alat yang bermasalah (berhenti, bentrok) diwarnai merah supaya efek rencana terlihat di alur.
      id: e.id, source: e.source, target: e.target, type: "smoothstep", className: tone.get(e.target) === "crit" && e.kind !== "summary" ? "edge-blocked" : `edge-${e.kind}`, label: e.via ? `via ${e.via} alat` : undefined,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: e.kind === "flow" ? "var(--color-accent-fill)" : "var(--color-on-surface-muted)" },
    }));
    return { stages, pos, edges, raw, columns };
  }, [visible, all]);
  const nodes: (AssetNode | StageNode)[] = [
    ...graph.stages,
    ...visible.map(a => ({ id: a.id, type: "asset" as const, position: graph.pos[a.id], data: { ...a, picked: a.id === picked, onPick: pick, badge: badges[a.id] } })),
  ];
  const asset = all.find(a => a.id === picked);

  useEffect(() => {
    // Layar penuh di dalam halaman, bukan Fullscreen API: API itu ditolak diam-diam di browser tertanam (mis. panel aplikasi).
    if (!full) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKey); };
  }, [full]);

  // Layar penuh dirender ke body: Card memakai backdrop-filter, jadi position: fixed di dalamnya terkurung di kartu.
  const portal = (frame: ReactNode) => full ? createPortal(frame, document.body) : frame;
  return <Card className="flow-card">
    {portal(<div className={`flow-frame ${full ? "is-full" : ""}`} role={full ? "dialog" : undefined} aria-modal={full || undefined} aria-label={full ? `${label} layar penuh` : undefined}>
      <div className="flow-toolbar">
        <span className="small muted">{ASSETS.length} alat</span>
        <button className="icon-button" onClick={() => setFull(f => !f)} aria-label={full ? "Keluar dari layar penuh (Esc)" : "Tampilkan layar penuh"} title={full ? "Keluar dari layar penuh (Esc)" : "Layar penuh"}><Icon icon={full ? Minimize2 : Maximize2} size={18} /></button>
      </div>
      {toolbar}
      <div className={`flow-body ${asset ? "with-inspector" : ""}`}>
        <div className="flow-canvas">
          {mode === "3d" ? <Flow3D key={String(full)} assets={visible} edges={graph.raw} pos={graph.pos} columns={graph.columns} badges={badges} picked={picked} onPick={setPicked} onClear={() => setPicked(null)} label={`${label} 3D`} /> : <ReactFlow
            key={String(full)}
            nodes={nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            onPaneClick={() => setPicked(null)}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            fitViewOptions={{ padding: 0.12, minZoom: 0.35 }}
            onInit={rf => {
              flow.current = rf;
              // HP: seluruh alur terlalu kecil untuk dibaca, jadi mulai dari dua tahap pertama lalu geser ke kanan.
              if (!window.matchMedia("(max-width: 767px)").matches) return;
              const first = new Set(STAGES.slice(0, 2));
              void rf.fitView({ nodes: nodes.filter(n => first.has(n.type === "asset" ? n.data.stage : n.data.label)), padding: 0.15, maxZoom: 1 });
            }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            ariaLabelConfig={{ "controls.zoomIn.ariaLabel": "Perbesar alur", "controls.zoomOut.ariaLabel": "Perkecil alur", "controls.fitView.ariaLabel": "Pas ke layar" }}
          >
            <Background gap={22} size={1} />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>}
        </div>
        {asset && <Aside key={asset.id} asset={asset} onPick={pick} onClose={() => setPicked(null)} />}
      </div>
    </div>)}
    <div className="flow-legend">
      <span><i className="legend-line" aria-hidden="true" />Mengalir</span>
      <span><i className="legend-line idle" aria-hidden="true" />Tidak mengalir</span>
      {mode === "3d" && <span><i className="legend-dot crit" aria-hidden="true" />Denyut merah: alat bermasalah</span>}
      <span><Icon icon={MousePointer2} size={14} />{mode === "3d" ? `${hint.replace(/\.$/, "")}. Seret untuk menggeser, klik kanan untuk memutar, gulir untuk zoom.` : hint}</span>
    </div>
  </Card>;
}
