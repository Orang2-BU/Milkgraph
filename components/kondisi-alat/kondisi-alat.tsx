"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Badge, Card, Icon, PageHeading, Toggle } from "@/components/ui";
import { ASSETS as ALL, type Asset } from "@/lib/assets";
import { groupAttention } from "./groups";

const GROUPED = groupAttention(ALL);
const ATTENTION_COUNT = GROUPED.reduce((n, g) => n + g.items.length, 0);

function AssetTable({ rows }: { rows: Asset[] }) {
  return <div className="table-wrap"><table className="asset-table">
    <thead><tr><th>Alat</th><th>Tahap</th><th>Kondisi</th><th>Keterangan</th><th><span className="sr-only">Detail</span></th></tr></thead>
    <tbody>{rows.map(a => <tr key={a.id}>
      <td><strong className="mono">{a.id}</strong></td>
      <td data-label="Tahap">{a.group}</td>
      <td data-label="Kondisi"><Badge tone={a.tone}>{a.status}</Badge></td>
      <td data-label="Keterangan" className="asset-note">{a.note}</td>
      <td className="table-action"><Link className="text-link" href={a.href} aria-label={`Detail ${a.id}`}>Detail<Icon icon={ArrowRight} size={14} /></Link></td>
    </tr>)}</tbody>
  </table></div>;
}

export function KondisiAlat() {
  const [view, setView] = useState<"semua" | "perhatian">("semua");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const hit = (a: Asset) => !q || `${a.id} ${a.group} ${a.status} ${a.note}`.toLowerCase().includes(q);
  const rows = ALL.filter(hit);
  const groups = GROUPED.map(g => ({ ...g, items: g.items.filter(hit) })).filter(g => g.items.length);
  const empty = view === "semua" ? !rows.length : !groups.length;

  return <div className="page-enter">
    <PageHeading title="Kondisi Alat" subtitle="Kondisi setiap alat pada snapshot pukul 14.42, diurutkan sesuai alur produksi." />
    <div className="page-tabs"><Toggle label="Tampilan alat" value={view} onChange={setView} options={[{ value: "semua", label: `Semua (${ALL.length})` }, { value: "perhatian", label: `Perlu diperhatikan (${ATTENTION_COUNT})` }]} /></div>
    <Card>
      <div className="asset-toolbar">
        <label className="asset-search"><Icon icon={Search} size={16} /><span className="sr-only">Cari alat</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, kode, atau kondisi..." autoComplete="off" /></label>
      </div>
      {empty ? <p className="muted asset-empty">{q ? <>Tidak ada alat yang cocok dengan &quot;{query}&quot;.</> : "Semua alat dalam kondisi normal."}</p>
        : view === "semua" ? <AssetTable rows={rows} />
        : groups.map(g => <section key={g.id} className={`asset-group ${g.id}`} aria-labelledby={`grp-${g.id}`}>
          <header><h2 id={`grp-${g.id}`}>{g.title} <span className="asset-group-count">{g.items.length}</span></h2><p>{g.hint}</p></header>
          <AssetTable rows={g.items} />
        </section>)}
    </Card>
  </div>;
}
