"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, type Node, type Edge, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2, Minimize2, MousePointer2 } from "lucide-react";
import { Card, Icon, PageHeading, Toggle } from "@/components/ui";
import { Equipment, KIND_LABEL } from "@/components/trace/equipment";
import { ASSETS, FOCUS, LINKS, STAGES, type Asset } from "@/lib/assets";

const CARD = 150;
const SUB = 172;
const GAP = 48;
const ROW = 148;
const TOP = 56;
const MAX_ROWS = 5;

type AssetNode = Node<Asset, "asset">;
type StageNode = Node<{ label: string }, "stage">;

function AssetCard({ data }: NodeProps<AssetNode>) {
  return <Link href={data.href} className={`flow-node ${data.active ? "is-active" : ""}`} aria-label={`${KIND_LABEL[data.kind] ?? data.kind} ${data.id}, ${data.status}. Lihat detail`}>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    <Equipment kind={data.kind} size={48} />
    <strong>{data.id}</strong>
    <span className={`mini-status ${data.tone}`}><span className={`status-dot tone-${data.tone}`} aria-hidden="true" />{data.status}</span>
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </Link>;
}
function StageLabel({ data }: NodeProps<StageNode>) {
  return <span className="flow-stage">{data.label}</span>;
}
const nodeTypes = { asset: AssetCard, stage: StageLabel };

/**
 * Kolom per tahap, alat ditumpuk dari atas. Tahap dengan lebih dari MAX_ROWS alat dipecah jadi beberapa sub-kolom
 * supaya canvas tidak memanjang ke bawah. Tahap tanpa alat (mis. di Fokus Shift) tetap tampil agar urutan tahap konsisten.
 */
function layout(assets: Asset[]) {
  const ids = new Set(assets.map(a => a.id));
  const byId = new Map(assets.map(a => [a.id, a]));
  const nodes: (AssetNode | StageNode)[] = [];
  let x = 0;
  for (const stage of STAGES) {
    const items = assets.filter(a => a.stage === stage);
    const subs = Math.max(1, Math.ceil(items.length / MAX_ROWS));
    nodes.push({ id: `stage-${stage}`, type: "stage", position: { x, y: 0 }, data: { label: stage }, style: { width: subs * SUB - (SUB - CARD) }, selectable: false, draggable: false });
    items.forEach((a, i) => nodes.push({ id: a.id, type: "asset", position: { x: x + Math.floor(i / MAX_ROWS) * SUB, y: TOP + (i % MAX_ROWS) * ROW }, data: a }));
    x += subs * SUB + GAP;
  }
  const edges: Edge[] = LINKS.filter(([s, t]) => ids.has(s) && ids.has(t)).map(([s, t]) => {
    const flowing = byId.get(s)!.active && byId.get(t)!.active;
    return { id: `${s}>${t}`, source: s, target: t, type: "smoothstep", className: flowing ? "edge-active" : "edge-idle", markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: flowing ? "var(--color-accent-fill)" : "var(--color-border)" } };
  });
  return { nodes, edges };
}

/** Tampilan default Operasional: alur alat produksi saja, tanpa ringkasan lain. */
export function Alur() {
  const [view, setView] = useState<"fokus" | "semua">("fokus");
  const [full, setFull] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const graph = useMemo(() => layout(view === "fokus" ? ASSETS.filter(a => FOCUS.has(a.id)) : ASSETS), [view]);

  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void frame.current?.requestFullscreen(); };

  return <div className="page-enter">
    <PageHeading title="Alur Produksi" subtitle="Alur susu dari bay bongkar sampai mesin filling, snapshot 14.42." />
    <Card className="flow-card">
      <div ref={frame} className="flow-frame">
        <div className="flow-toolbar">
          <Toggle label="Alat yang ditampilkan" value={view} onChange={setView} options={[{ value: "fokus", label: "Fokus Shift" }, { value: "semua", label: `Semua Alat (${ASSETS.length})` }]} />
          <button className="icon-button" onClick={toggleFull} aria-label={full ? "Keluar dari layar penuh" : "Tampilkan layar penuh"}><Icon icon={full ? Minimize2 : Maximize2} size={18} /></button>
        </div>
        <div className="flow-canvas">
          <ReactFlow
            key={view}
            nodes={graph.nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.12, minZoom: 0.35 }}
            onInit={rf => {
              // HP: seluruh alur terlalu kecil untuk dibaca, jadi mulai dari dua tahap pertama lalu geser ke kanan.
              if (!window.matchMedia("(max-width: 767px)").matches) return;
              const first = new Set(STAGES.slice(0, 2));
              void rf.fitView({ nodes: graph.nodes.filter(n => n.type === "asset" ? first.has(n.data.stage) : first.has(n.data.label)), padding: 0.15, maxZoom: 1 });
            }}
            minZoom={0.2}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
            ariaLabelConfig={{ "controls.zoomIn.ariaLabel": "Perbesar alur", "controls.zoomOut.ariaLabel": "Perkecil alur", "controls.fitView.ariaLabel": "Pas ke layar" }}
          >
            <Background gap={22} size={1} />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>
        </div>
      </div>
      <div className="flow-legend">
        <span><i className="legend-line" aria-hidden="true" />Mengalir</span>
        <span><i className="legend-line idle" aria-hidden="true" />Tidak mengalir</span>
        <span><Icon icon={MousePointer2} size={14} />Geser kanvas, scroll untuk zoom, klik alat untuk detail</span>
      </div>
    </Card>
  </div>;
}
