"use client";

import { useState } from "react";
import { CalendarClock, ClipboardCheck, Download, FlaskConical, PackageX, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDemo, type LogEntry, type LogKind } from "@/lib/demo";
import { pastLog } from "@/mock/ops";
import { API_MODE, API_URL } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { Badge, Card, Icon, PageHeading, Toggle } from "@/components/ui";

const KINDS: Record<LogKind, { label: string; icon: LucideIcon }> = {
  rencana: { label: "Rencana", icon: CalendarClock },
  hold: { label: "Hold", icon: PackageX },
  lab: { label: "Lab", icon: FlaskConical },
  constraint: { label: "Constraint", icon: SlidersHorizontal },
  instruksi: { label: "Instruksi", icon: ClipboardCheck },
};
type Filter = LogKind | "semua";
const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function Persetujuan() {
  const demo = useDemo();
  const [filter, setFilter] = useState<Filter>("semua");
  const auditRes = useResource<LogEntry[]>(API_MODE ? "/audit" : null);

  if (API_MODE && !auditRes.data) {
    if (auditRes.error) {
      return (
        <div className="page-enter" role="status">
          <p className="crit-text">Gagal memuat Riwayat Persetujuan: {auditRes.error.message}</p>
        </div>
      );
    }
    return <div className="page-enter" role="status"><p className="muted">Memuat Riwayat Persetujuan…</p></div>;
  }

  const all = API_MODE ? (auditRes.data ?? []) : [...demo.log, ...pastLog];
  const rows = all.filter(e => filter === "semua" || e.kind === filter);

  async function exportCsv() {
    if (API_MODE) {
      try {
        const path = `${API_URL}/api/v1/audit.csv${filter === "semua" ? "" : `?kind=${filter}`}`;
        const res = await fetch(path, { headers: { "X-Demo-Role": demo.role } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: "milkgraph-riwayat-persetujuan.csv" });
        a.click();
        URL.revokeObjectURL(url);
        return;
      } catch {
        // fallback to generating lines below if network issue
      }
    }
    const lines = [["Waktu", "Jenis", "Keputusan", "Objek", "Catatan", "Oleh", "Peran"], ...rows.map(e => [e.at, KINDS[e.kind].label, e.title, e.detail, e.note, e.by, e.role])];
    const url = URL.createObjectURL(new Blob(["\ufeff" + lines.map(l => l.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "milkgraph-riwayat-persetujuan.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  return <div className="page-enter">
    <PageHeading title="Riwayat Persetujuan" subtitle="Jejak audit keputusan planner, QA, dan tim lapangan beserta catatan dan perannya."><button className="button secondary" onClick={exportCsv} disabled={!rows.length}><Icon icon={Download} size={16} />Unduh CSV</button></PageHeading>
    <div className="scenario-bar"><Toggle label="Jenis keputusan" value={filter} onChange={setFilter} options={[{ value: "semua", label: `Semua (${all.length})` }, ...(Object.keys(KINDS) as LogKind[]).map(k => ({ value: k, label: `${KINDS[k].label} (${all.filter(e => e.kind === k).length})` }))]} /></div>
    <Card>{rows.length ? <ol className="audit-list">{rows.map(e => <li key={`${e.id}-${e.at}`}>
      <span className={`audit-icon ${e.tone}`}><Icon icon={KINDS[e.kind].icon} size={16} /></span>
      <div><div className="audit-top"><strong>{e.title}</strong><Badge tone={e.tone}>{KINDS[e.kind].label}</Badge></div><p>{e.detail}</p>{e.note && <p className="audit-note">&ldquo;{e.note}&rdquo;</p>}<span className="small muted">{e.by} · {e.role} · {e.at}</span></div>
    </li>)}</ol> : <p className="small muted">Belum ada keputusan jenis ini. Keputusan di halaman lain akan tercatat di sini.</p>}</Card>
  </div>;
}
