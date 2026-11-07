"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Badge, Card, Icon, PageHeading, Toggle } from "@/components/ui";
import { ASSETS } from "@/lib/assets";
import type { Tone } from "@/mock/types";

const RANK: Record<Tone, number> = { crit: 0, warn: 1, ok: 2, neutral: 3 };
const ATTENTION = ASSETS.filter(a => a.tone === "crit" || a.tone === "warn").sort((a, b) => RANK[a.tone] - RANK[b.tone]);

export function KondisiAlat() {
  const [view, setView] = useState<"semua" | "perhatian">("semua");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = (view === "semua" ? ASSETS : ATTENTION).filter(a => !q || `${a.id} ${a.group} ${a.status} ${a.note}`.toLowerCase().includes(q));

  return <div className="page-enter">
    <PageHeading title="Kondisi Alat" subtitle="Status setiap alat pada snapshot 14.42, urut sesuai alur produksi." />
    <Card>
      <div className="asset-toolbar">
        <Toggle label="Tampilan alat" value={view} onChange={setView} options={[{ value: "semua", label: `Semua (${ASSETS.length})` }, { value: "perhatian", label: `Perlu diperhatikan (${ATTENTION.length})` }]} />
        <label className="asset-search"><Icon icon={Search} size={16} /><span className="sr-only">Cari alat</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, kode, atau kondisi..." autoComplete="off" /></label>
      </div>
      {rows.length ? <div className="table-wrap"><table className="asset-table">
        <thead><tr><th>Alat</th><th>Tahap</th><th>Kondisi</th><th>Keterangan</th><th><span className="sr-only">Detail</span></th></tr></thead>
        <tbody>{rows.map(a => <tr key={a.id}>
          <td><strong className="mono">{a.id}</strong></td>
          <td data-label="Tahap">{a.group}</td>
          <td data-label="Kondisi"><Badge tone={a.tone}>{a.status}</Badge></td>
          <td data-label="Keterangan" className="asset-note">{a.note}</td>
          <td className="table-action"><Link className="text-link" href={a.href} aria-label={`Detail ${a.id}`}>Detail<Icon icon={ArrowRight} size={14} /></Link></td>
        </tr>)}</tbody>
      </table></div> : <p className="muted asset-empty">Tidak ada alat yang cocok dengan &quot;{query}&quot;.</p>}
    </Card>
  </div>;
}
