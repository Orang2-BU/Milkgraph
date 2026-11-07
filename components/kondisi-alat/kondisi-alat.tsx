"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Badge, Card, Icon, PageHeading, Toggle } from "@/components/ui";
import { scenario } from "@/lib/data";
import { number } from "@/lib/format";
import { asepticTanks, fillers, midTanks, UNIT_STATE, type MidTank } from "@/mock/ops";
import type { Tone } from "@/mock/types";

interface Asset { id: string; group: string; status: string; tone: Tone; note: string; href: string }

const MID: Record<MidTank["state"], { label: string; tone: Tone }> = { terisi: { label: "Terisi", tone: "ok" }, kosong: { label: "Kosong", tone: "neutral" }, cip: { label: "CIP", tone: "warn" }, tertahan: { label: "Tertahan", tone: "warn" } };

/** Semua alat dalam urutan alur produksi. Halaman detail tetap /tangki dan /filling. */
const ASSETS: Asset[] = [
  ...scenario.assets.map(a => ({ id: a.id, group: a.kind === "Bay" ? "Penerimaan" : "Susu mentah", status: a.status, tone: a.tone, note: `${number(a.fill)} / ${number(a.capacity)} ${a.unit} · ${a.info}`, href: "/tangki" })),
  ...midTanks.map(t => ({ id: t.id, group: `${t.group}`, status: MID[t.state].label, tone: MID[t.state].tone, note: t.note, href: "/tangki" })),
  ...asepticTanks.map(t => ({ id: t.sterilizer, group: "Sterilisasi", status: UNIT_STATE[t.sterilizerState].label, tone: UNIT_STATE[t.sterilizerState].tone, note: `Ke ${t.id} · ${t.product}`, href: "/filling" })),
  ...asepticTanks.map(t => {
    const thin = t.planned && t.level < t.capacity * 0.1;
    return { id: t.id, group: "Tangki aseptik", status: thin ? "Pasokan menipis" : t.level ? "Terisi" : "Kosong", tone: (thin ? "crit" : t.level ? "ok" : "neutral") as Tone, note: `${number(t.level)} / ${number(t.capacity)} L · melayani ${t.fillers.join(" dan ")}`, href: "/filling" };
  }),
  ...fillers.map(f => ({ id: f.id, group: "Filling", status: UNIT_STATE[f.state].label, tone: UNIT_STATE[f.state].tone, note: `${f.product} · ${f.note}`, href: "/filling" })),
];
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
