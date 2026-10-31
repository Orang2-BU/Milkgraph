"use client";

import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Network, Maximize2 } from "lucide-react";
import { scenario } from "@/lib/data";
import type { Answer } from "@/mock/types";
import { Icon, Modal } from "@/components/ui";
import { Equipment, KIND_LABEL } from "./equipment";
import "@xyflow/react/dist/style.css";

type EvidenceNode = Node<{ label: string; kind: string; active: boolean; focused: boolean; selected: boolean; select: () => void }, "evidence">;
function GraphNode({ data }: NodeProps<EvidenceNode>) {
  return <button onClick={data.select} aria-pressed={data.selected} aria-label={`${KIND_LABEL[data.kind] ?? data.kind} ${data.label}, lihat detail`} className={`evidence-node ${data.active ? "evidence-active" : "evidence-muted"} ${data.focused ? "evidence-focused" : ""} ${data.selected ? "evidence-selected" : ""}`}><Handle type="target" position={Position.Left} /><Equipment kind={data.kind} /><strong className="mono">{data.label}</strong><span className="node-kind">{KIND_LABEL[data.kind] ?? data.kind}</span><Handle type="source" position={Position.Right} /></button>;
}
const nodeTypes = { evidence: GraphNode };
/** Graph genealogi kiri ke kanan: farm, RT, tangki, alat proses, filling, lalu lot. Kolom = rank node. */
export function EvidenceGraph({ answer, highlighted, selected, onSelect }: { answer: Answer | null; highlighted: string | null; selected: string | null; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [all, setAll] = useState(false);
  const graph = useMemo(() => {
    const visible = all || !answer ? scenario.graph.nodes : scenario.graph.nodes.filter(n => answer.nodes.includes(n.id));
    // Hasil lab ditaruh satu kolom sebelum node yang diujinya, lalu kolom kosong dirapatkan agar graph tetap besar.
    const rankOf = (node: (typeof visible)[number]) => { if (node.type !== "LabResult") return node.rank; const target = scenario.graph.edges.find(e => e.source === node.id); const t = target && scenario.graph.nodes.find(n => n.id === target.target); return t ? Math.max(0, t.rank - 1) : node.rank; };
    const columns = [...new Set(visible.map(rankOf))].sort((a, b) => a - b);
    const layers = new Map<number, typeof visible>();
    for (const node of visible) { const col = columns.indexOf(rankOf(node)); layers.set(col, [...(layers.get(col) ?? []), node]); }
    const nodes: EvidenceNode[] = visible.map(node => {
      const col = columns.indexOf(rankOf(node));
      const layer = layers.get(col)!;
      const i = layer.indexOf(node);
      return { id: node.id, type: "evidence", position: { x: col * 156, y: (i - (layer.length - 1) / 2) * 128 }, data: { label: node.label, kind: node.type, active: !!answer?.nodes.includes(node.id), focused: node.id === highlighted, selected: node.id === selected, select: () => onSelect(node.id) }, focusable: false };
    });
    const ids = new Set(nodes.map(n => n.id));
    const edges = scenario.graph.edges.filter(e => ids.has(e.source) && ids.has(e.target)).map(e => { const active = !!answer?.edges.includes(e.id); return { ...e, type: "smoothstep", animated: false, className: `${active ? "edge-active" : "edge-muted"} ${e.planned ? "edge-planned" : ""}`, label: undefined }; });
    return { nodes, edges };
  }, [answer, highlighted, selected, all, onSelect]);
  const canvas = <ReactFlow key={`${answer?.id}-${all}-${expanded}`} nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.08, minZoom: 0.45 }} minZoom={0.25} maxZoom={1.6} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} onNodeClick={(_, node) => onSelect(node.id)} ariaLabelConfig={{ "controls.zoomIn.ariaLabel": "Perbesar graph", "controls.zoomOut.ariaLabel": "Perkecil graph", "controls.fitView.ariaLabel": "Pas ke layar" }}><Background gap={22} size={1} /><Controls showInteractive={false} /></ReactFlow>;
  return <><div className="graph-toolbar"><span><Icon icon={Network} size={16} />{graph.nodes.length} alat dan titik · {graph.edges.length} aliran</span><div><button className="text-link" onClick={() => setAll(!all)} aria-pressed={all}>{all ? "Fokus jalur" : "Semua node"}</button><button className="icon-button" aria-label="Perluas graph" onClick={() => setExpanded(true)}><Icon icon={Maximize2} size={16} /></button></div></div><div className="graph-canvas">{canvas}</div><div className="graph-legend"><span><i className="legend-square accent" />Jalur bukti</span><span><i className="legend-square neutral" />Konteks lain</span><span className="small muted">Klik alat untuk detail · ilustrasi skematik</span></div>{expanded && <Modal title="Graph genealogi" onClose={() => setExpanded(false)} className="graph-modal"><div className="graph-canvas">{canvas}</div></Modal>}</>;
}
