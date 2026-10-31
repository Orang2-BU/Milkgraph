"use client";

import { useMemo, useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Container, Database, Droplets, Factory, FlaskConical, Flame, Layers, MapPin, Network, Package, SprayCan, Truck, Warehouse, Wind, Maximize2 } from "lucide-react";
import { scenario } from "@/lib/data";
import type { Answer, Scenario } from "@/mock/types";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { Icon, Modal } from "@/components/ui";
import "@xyflow/react/dist/style.css";

type EvidenceNode = Node<{ label: string; kind: string; active: boolean; focused: boolean; open: () => void }, "evidence">;
const glyphs: Record<string, typeof Database> = { Farm: MapPin, RT: Truck, LabResult: FlaskConical, Buffer: Container, Bay: Warehouse, CIPEvent: SprayCan, Separator: Wind, Thermal: Flame, Storage: Container, Cream: Droplets, Mixing: Layers, Premix: Layers, Sterilisasi: Flame, Aseptic: Container, Filling: Factory, Lot: Package };
function GraphNode({ data }: NodeProps<EvidenceNode>) {
  return <button onClick={data.open} className={`evidence-node ${data.active ? "evidence-active" : "evidence-muted"} ${data.focused ? "evidence-focused" : ""}`}><Handle type="target" position={Position.Top} /><span className="node-icon"><Icon icon={glyphs[data.kind] ?? Database} size={18} /></span><span><span className="node-kind">{data.kind}</span><strong className="mono">{data.label}</strong></span><Handle type="source" position={Position.Bottom} /></button>;
}
const nodeTypes = { evidence: GraphNode };
export function EvidenceGraph({ answer, highlighted, onSource, graphData }: { answer: Answer | null; highlighted: string | null; onSource: (id: string) => void; graphData?: Scenario["graph"] | null }) {
  const [expanded, setExpanded] = useState(false);
  const [all, setAll] = useState(false);
  const graphRes = useResource<Scenario["graph"]>(API_MODE && !graphData ? "/graph" : null);
  const rawGraph = graphData ?? (API_MODE ? graphRes.data : scenario.graph);

  const graph = useMemo(() => {
    if (!rawGraph) return { nodes: [], edges: [] };
    const visible = all || !answer ? rawGraph.nodes : rawGraph.nodes.filter(n => answer.nodes.includes(n.id));
    const layers = new Map<number, typeof visible>();
    for (const node of visible) layers.set(node.rank, [...(layers.get(node.rank) ?? []), node]);
    const nodes: EvidenceNode[] = visible.map(node => {
      const layer = layers.get(node.rank)!;
      const i = layer.indexOf(node);
      return { id: node.id, type: "evidence", position: { x: (i - (layer.length - 1) / 2) * 190, y: node.rank * 96 }, data: { label: node.label, kind: node.type, active: !!answer?.nodes.includes(node.id), focused: node.id === highlighted, open: () => onSource(node.source) }, ariaLabel: `${node.type} ${node.label}`, focusable: false };
    });
    const ids = new Set(nodes.map(n => n.id));
    const edges = rawGraph.edges.filter(e => ids.has(e.source) && ids.has(e.target)).map(e => ({ ...e, type: "smoothstep", animated: false, className: `${answer?.edges.includes(e.id) ? "edge-active" : "edge-muted"} ${e.planned ? "edge-planned" : ""}`, label: e.label }));
    return { nodes, edges };
  }, [rawGraph, answer, highlighted, all, onSource]);

  if (API_MODE && !rawGraph) {
    if (graphRes.error) {
      return <div className="graph-canvas" role="status"><p className="crit-text">Gagal memuat graph: {graphRes.error.message}</p></div>;
    }
    return <div className="graph-canvas" role="status"><p className="muted">Memuat graph…</p></div>;
  }

  const canvas = <ReactFlow key={`${answer?.id}-${all}-${expanded}`} nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.12 }} minZoom={0.3} maxZoom={1.6} nodesDraggable={false} nodesConnectable={false} elementsSelectable onNodeClick={(_, node) => { const item = rawGraph?.nodes.find(n => n.id === node.id); if (item) onSource(item.source); }} ariaLabelConfig={{ "controls.zoomIn.ariaLabel": "Perbesar graph", "controls.zoomOut.ariaLabel": "Perkecil graph", "controls.fitView.ariaLabel": "Pas ke layar" }}><Background gap={22} size={1} /><Controls showInteractive={false} /></ReactFlow>;
  return <><div className="graph-toolbar"><span><Icon icon={Network} size={16} />{graph.nodes.length} node · {graph.edges.length} relasi</span><div><button className="text-link" onClick={() => setAll(!all)} aria-pressed={all}>{all ? "Fokus jalur" : "Semua node"}</button><button className="icon-button" aria-label="Perluas graph" onClick={() => setExpanded(true)}><Icon icon={Maximize2} size={16} /></button></div></div><div className="graph-canvas">{canvas}</div><div className="graph-legend"><span><i className="legend-square accent" />Jalur bukti</span><span><i className="legend-square neutral" />Konteks lain</span><span className="small muted">Klik node untuk membuka sumber</span></div>{expanded && <Modal title="Graph view genealogi" onClose={() => setExpanded(false)} className="graph-modal"><div className="graph-canvas">{canvas}</div></Modal>}</>;
}
