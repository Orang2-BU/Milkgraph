"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Badge, Icon } from "@/components/ui";
import { Equipment, KIND_LABEL } from "@/components/trace/equipment";
import { LINKS, type Asset } from "@/lib/assets";

const DETAIL: Record<string, string> = { "/tangki": "Bay & Tangki", "/filling": "Lini Filling" };

/** Panel info alat yang dipilih di canvas: apa alatnya, kondisinya, dan ke mana susunya mengalir. Hanya baca. */
export function AssetInfo({ asset, assets, onPick, onClose }: { asset: Asset; assets: Asset[]; onPick: (id: string) => void; onClose: () => void }) {
  const from = LINKS.filter(([, t]) => t === asset.id).map(([s]) => s);
  const to = LINKS.filter(([s]) => s === asset.id).map(([, t]) => t);
  const related = (ids: string[], empty: string) => ids.length
    ? <ul className="flow-related">{ids.map(id => { const a = assets.find(x => x.id === id); return <li key={id}><button type="button" onClick={() => onPick(id)}><span className={`status-dot tone-${a?.tone ?? "neutral"}`} aria-hidden="true" /><span className="mono">{id}</span><small>{a?.status}</small></button></li>; })}</ul>
    : <p className="small muted">{empty}</p>;

  return <aside className="flow-inspector" aria-label={`Info ${asset.id}`}>
    <header>
      <Equipment kind={asset.kind} size={44} />
      <div><h2>{asset.id}</h2><p>{KIND_LABEL[asset.kind] ?? asset.kind}</p></div>
      <button className="icon-button" aria-label="Tutup info alat" onClick={onClose}><Icon icon={X} size={18} /></button>
    </header>
    <Badge tone={asset.tone}>{asset.status}</Badge>
    <dl className="flow-facts">
      <div><dt>Tahap</dt><dd>{asset.stage}</dd></div>
      <div><dt>Keterangan</dt><dd>{asset.note}</dd></div>
    </dl>
    <section><h3>Menerima dari</h3>{related(from, "Titik awal alur, susu masuk dari road tanker.")}</section>
    <section><h3>Mengirim ke</h3>{related(to, "Titik akhir alur, produk keluar ke gudang.")}</section>
    <Link className="button secondary wide" href={asset.href}>Buka detail di {DETAIL[asset.href] ?? "Kondisi Alat"}<Icon icon={ArrowRight} size={16} /></Link>
  </aside>;
}
