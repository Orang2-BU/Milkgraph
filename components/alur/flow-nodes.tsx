"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Equipment, KIND_LABEL } from "@/components/trace/equipment";
import type { Asset } from "@/lib/assets";

export type AssetNode = Node<Asset & { picked: boolean; onPick: (id: string) => void; badge?: string }, "asset">;
export type StageNode = Node<{ label: string; count: number }, "stage">;

/** Kartu alat. Diklik atau ditekan Enter untuk membuka panel info alat. */
function AssetCard({ data }: NodeProps<AssetNode>) {
  return <>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    <button type="button" className={`flow-node ${data.active ? "is-active" : ""} ${data.picked ? "is-selected" : ""}`} aria-pressed={data.picked} aria-label={`${KIND_LABEL[data.kind] ?? data.kind} ${data.id}, ${data.status}${data.badge ? `, ${data.badge}` : ""}. Pilih alat`} onClick={() => data.onPick(data.id)}>
      <Equipment kind={data.kind} size={48} />
      <strong>{data.id}</strong>
      <span className={`mini-status ${data.tone}`}><span className={`status-dot tone-${data.tone}`} aria-hidden="true" />{data.status}</span>
      {data.badge && <span className="flow-badge">{data.badge}</span>}
    </button>
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </>;
}

function StageHeader({ data }: NodeProps<StageNode>) {
  return <div className="flow-stage"><span>{data.label}<small>{data.count} alat</small></span></div>;
}

export const nodeTypes = { asset: AssetCard, stage: StageHeader };
