"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Database, PlugZap, RefreshCw, ShieldCheck } from "lucide-react";
import { demoClock } from "@/lib/demo";
import { dataSources } from "@/mock/ops";
import { Badge, Card, Icon, PageHeading, SectionTitle } from "@/components/ui";

type Check = { state: "running" } | { state: "done"; ok: boolean; text: string };

export function SumberData() {
  const [synced, setSynced] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function test(id: string) {
    const source = dataSources.find(s => s.id === id)!;
    setChecks(c => ({ ...c, [id]: { state: "running" } }));
    timers.current.push(setTimeout(() => setChecks(c => ({ ...c, [id]: source.status === "terhubung"
      ? { state: "done", ok: true, text: `Terhubung, ${source.latencyMs} ms, hak akses baca saja` }
      : { state: "done", ok: false, text: "Batch harian, data berikutnya 06.00 besok" } })), 700));
  }

  return <div className="page-enter">
    <PageHeading title="Sumber Data" subtitle="Sistem pabrik yang mengisi context graph. Semua koneksi read-only: MilkGraph membaca data, tidak mengendalikan mesin." />
    <section className="callout"><Icon icon={ShieldCheck} size={18} /><div><strong>Konektor simulasi</strong><p>Di mockup, setiap konektor membaca data skenario. Integrasi SCADA, LIMS, dan weighbridge nyata ada di tahap prototipe.</p></div><Link className="text-link" href="/graph">Lihat context graph<Icon icon={ArrowRight} size={14} /></Link></section>
    <div className="source-grid">{dataSources.map(s => { const check = checks[s.id]; return <Card key={s.id} className="source-card">
      <div className="tank-top"><span className="tank-id"><Icon icon={Database} size={18} /><strong>{s.name}</strong></span><Badge tone={s.status === "terhubung" ? "ok" : "warn"}>{s.status === "terhubung" ? "Terhubung" : "Menunggu batch"}</Badge></div>
      <p className="small muted">{s.system}</p>
      <dl className="fact-list"><div><dt>Protokol</dt><dd>{s.protocol}</dd></div><div><dt>Interval</dt><dd>{s.interval}</dd></div><div><dt>Sinkron terakhir</dt><dd>{synced[s.id] ?? s.lastSync}</dd></div><div><dt>Data</dt><dd>{s.records}</dd></div></dl>
      <p className="feeds"><span className="small muted">Mengisi graph:</span> <span className="mono">{s.feeds}</span></p>
      {check && <p className={`small with-icon ${check.state === "done" ? check.ok ? "ok-text" : "warn-text" : "muted"}`} role="status">{check.state === "running" ? "Menguji koneksi..." : check.text}</p>}
      <div className="page-actions"><button className="button secondary" disabled={check?.state === "running"} onClick={() => test(s.id)}><Icon icon={PlugZap} size={16} />Uji koneksi</button><button className="button secondary" disabled={s.status !== "terhubung"} onClick={() => setSynced(v => ({ ...v, [s.id]: demoClock() }))}><Icon icon={RefreshCw} size={16} />Sinkron sekarang</button></div>
    </Card>; })}</div>
    <Card><SectionTitle title="Pemetaan ke context graph" /><div className="table-wrap"><table><thead><tr><th>Sumber</th><th>Node dan relasi</th><th>Interval</th></tr></thead><tbody>{dataSources.map(s => <tr key={s.id}><td><strong>{s.name}</strong></td><td data-label="Node dan relasi"><span className="mono">{s.feeds}</span></td><td data-label="Interval">{s.interval}</td></tr>)}</tbody></table></div></Card>
  </div>;
}
