"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ReactFlow, Background, Controls, MarkerType, type Edge, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2, Minimize2, MousePointer2 } from "lucide-react";
import { Card, Icon, PageHeading, Toggle } from "@/components/ui";
import { ASSETS, FOCUS, LINKS, STAGES } from "@/lib/assets";
import { autoLayout, visibleEdges, CARD } from "./graph";
import { nodeTypes, type AssetNode, type StageNode } from "./flow-nodes";
import { AssetInfo } from "./asset-info";

/** Tampilan default Operasional: alur alat produksi. Klik alat untuk melihat info alatnya. Susunan alat mengikuti data plant. */
export function Alur() {
  const [view, setView] = useState<"fokus" | "semua">("fokus");
  const [picked, setPicked] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const flow = useRef<ReactFlowInstance<AssetNode | StageNode> | null>(null);
  // Panel info mempersempit canvas; geser kamera ke alat yang dipilih supaya tidak tertutup.
  const pick = (id: string) => {
    setPicked(id);
    requestAnimationFrame(() => {
      const n = flow.current?.getNode(id);
      if (n && flow.current) void flow.current.setCenter(n.position.x + CARD / 2, n.position.y + 60, { zoom: flow.current.getZoom(), duration: 300 });
    });
  };

  const visible = useMemo(() => view === "semua" ? ASSETS : ASSETS.filter(a => FOCUS.has(a.id)), [view]);
  const graph = useMemo(() => {
    const ids = new Set(visible.map(a => a.id));
    const { pos, columns } = autoLayout(visible, STAGES);
    const stages: StageNode[] = columns.map(c => ({ id: `stage-${c.stage}`, type: "stage", position: { x: c.x, y: 0 }, style: { width: Math.max(c.width, CARD) }, data: { label: c.stage, count: c.count }, selectable: false, draggable: false, focusable: false }));
    const edges: Edge[] = visibleEdges(ASSETS, LINKS, ids).map(e => ({
      id: e.id, source: e.source, target: e.target, type: "smoothstep", className: `edge-${e.kind}`, label: e.via ? `via ${e.via} alat` : undefined,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: e.kind === "flow" ? "var(--color-accent-fill)" : "var(--color-on-surface-muted)" },
    }));
    return { stages, pos, edges };
  }, [visible]);
  const nodes: (AssetNode | StageNode)[] = [
    ...graph.stages,
    ...visible.map(a => ({ id: a.id, type: "asset" as const, position: graph.pos[a.id], data: { ...a, picked: a.id === picked, onPick: pick } })),
  ];
  const asset = ASSETS.find(a => a.id === picked);

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
  return <div className="page-enter">
    <PageHeading title="Alur Produksi" subtitle="Alur susu dari bay bongkar sampai mesin filling, snapshot 14.42." />
    <Card className="flow-card">
      {portal(<div className={`flow-frame ${full ? "is-full" : ""}`} role={full ? "dialog" : undefined} aria-modal={full || undefined} aria-label={full ? "Alur produksi layar penuh" : undefined}>
        <div className="flow-toolbar">
          <Toggle label="Alat yang ditampilkan" value={view} onChange={v => { setView(v); setPicked(null); }} options={[{ value: "fokus", label: "Fokus Shift" }, { value: "semua", label: `Semua Alat (${ASSETS.length})` }]} />
          <button className="icon-button" onClick={() => setFull(f => !f)} aria-label={full ? "Keluar dari layar penuh (Esc)" : "Tampilkan layar penuh"} title={full ? "Keluar dari layar penuh (Esc)" : "Layar penuh"}><Icon icon={full ? Minimize2 : Maximize2} size={18} /></button>
        </div>
        <div className={`flow-body ${asset ? "with-inspector" : ""}`}>
          <div className="flow-canvas">
            <ReactFlow
              key={`${view}-${full}`}
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
            </ReactFlow>
          </div>
          {asset && <AssetInfo key={asset.id} asset={asset} assets={ASSETS} onPick={pick} onClose={() => setPicked(null)} />}
        </div>
      </div>)}
      <div className="flow-legend">
        <span><i className="legend-line" aria-hidden="true" />Mengalir</span>
        <span><i className="legend-line idle" aria-hidden="true" />Tidak mengalir</span>
        {view === "fokus" && <span><i className="legend-line summary" aria-hidden="true" />Jalur diringkas</span>}
        <span><Icon icon={MousePointer2} size={14} />Klik alat untuk melihat infonya</span>
      </div>
    </Card>
  </div>;
}
