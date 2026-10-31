"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Box, CalendarClock, ChevronDown, Clock3, Container, Droplets, FlaskConical, Hourglass, MapPin, PackageCheck, PackageOpen, ShieldCheck, Thermometer, TriangleAlert, Truck, Warehouse } from "lucide-react";
import { scenario } from "@/lib/data";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { apiSend } from "@/lib/api/client";
import { receivingHeadline } from "./api-view";
import type { Scenario } from "@/mock/types";
import { duration, number } from "@/lib/format";
import { useDemo } from "@/lib/demo";
import { holdingLeft, violations } from "@/lib/rules";
import { Badge, Card, Icon, SectionTitle, SourceButton, SourceModal } from "@/components/ui";

const metricIcons = [Truck, Clock3, FlaskConical, Warehouse];
const stageIcons = [MapPin, Truck, Droplets, FlaskConical, ShieldCheck, PackageOpen, PackageCheck];
type ReceivingData = Pick<Scenario, "metrics" | "stages" | "tankers" | "assets" | "labHistory"> & {
  labSummary: { avgMinutes: number; deltaMinutes: number };
  incident: { rt: string; holdingLeftMin: number; summary: string; factors: { label: string; sourceId: string }[] };
};
type CheckResult = { violations: { before: number } };
export function Receiving() {
  const [source, setSource] = useState<string | null>(null);
  const [filter, setFilter] = useState("Semua tahap");
  const demo = useDemo();
  const receiving = useResource<ReceivingData>(API_MODE ? "/receiving" : null);
  const meta = useResource<{ now: string }>(API_MODE ? "/meta" : null);
  const [checked, setChecked] = useState<CheckResult | null>(null);
  const [checkError, setCheckError] = useState<Error | null>(null);
  useEffect(() => {
    if (!API_MODE) return;
    let live = true;
    void apiSend<CheckResult>("POST", "/plans/current/check", {}, demo.role).then(value => { if (live) setChecked(value); }).catch(error => { if (live) setCheckError(error); });
    return () => { live = false; };
  }, [demo.role, demo.limits]);
  const data = API_MODE ? receiving.data : {
    ...scenario,
    labSummary: { avgMinutes: 52, deltaMinutes: 14 },
    incident: { rt: "RT-26", holdingLeftMin: holdingLeft(demo.limits), summary: "Antrean RT menumpuk karena lab test lama dan Bay 2 sedang CIP.", factors: [
      { label: "Lab test 52 menit", sourceId: "LAB-QUEUE" },
      { label: "Bay 2 CIP sampai 15.20", sourceId: "CIP-B2" },
      { label: "Holding time RT-26", sourceId: "HOLD-RT26" },
    ] },
  };
  if (!data || (API_MODE && (!meta.data || !checked))) {
    const error = receiving.error ?? meta.error ?? checkError;
    return <div className="page-enter" role="status">{error ? `Gagal memuat Receiving Flow: ${error.message}` : "Memuat Receiving Flow…"}</div>;
  }
  return <ReceivingContent data={data} now={API_MODE ? meta.data!.now : scenario.now} demo={demo} check={API_MODE ? checked! : { violations: { before: violations(scenario.plans[0], "before", demo.limits) } }} source={source} setSource={setSource} filter={filter} setFilter={setFilter} />;
}
function ReceivingContent({ data: scenario, now, demo, check, source, setSource, filter, setFilter }: { data: ReceivingData; now: string; demo: ReturnType<typeof useDemo>; check: CheckResult; source: string | null; setSource: (id: string | null) => void; filter: string; setFilter: (v: string) => void }) {
  const stages = ["Semua tahap", ...new Set(scenario.tankers.map(t => t.stage))];
  const approved = demo.decisions.find(d => d.plan === "current" && d.status === "approved");
  const tankers = scenario.tankers.filter(t => filter === stages[0] || t.stage === filter);
  return <div className="page-enter">
    <div className="page-heading"><div><h1>Receiving Flow</h1><p>Alur RT dari farm sampai tangki, diperbarui {now}</p></div><div className="page-actions"><Link className="button secondary" href="/simulasi"><Icon icon={Box} />Lihat simulasi 3D</Link><Link className="button primary" href="/rencana"><Icon icon={CalendarClock} />Periksa rencana<Icon icon={ArrowUpRight} size={16} /></Link></div></div>
    <div className="metrics-grid">{scenario.metrics.map((metric, i) => {
      const min = Math.min(...metric.trend) - 1;
      const range = Math.max(...metric.trend) - min || 1;
      const points = metric.trend.map((v, j) => `${j * 10},${36 - (v - min) / range * 29}`).join(" ");
      return <Card className="metric-card" key={metric.label}><div className="metric-label"><span className="metric-icon"><Icon icon={metricIcons[i]} /></span><span>{metric.label}</span><button className="metric-source icon-button" aria-label={`Lihat sumber ${metric.label}`} onClick={() => setSource(metric.source)}><Icon icon={ArrowUpRight} size={16} /></button></div><div className="metric-bottom"><div><p className="metric-value">{metric.value}<span>{metric.unit}</span></p><p className={`metric-delta ${i > 0 && i < 3 ? "brand-text" : ""}`}><Icon icon={i > 0 && i < 3 ? ArrowUpRight : ArrowDown} size={13} />{metric.delta}</p></div><svg className="sparkline" viewBox="0 0 110 42" role="img" aria-label={`Tren simulasi ${metric.label}: ${metric.trend.join(", ")}`}><polygon points={`0,42 ${points} 110,42`} /><polyline points={points} /></svg></div></Card>;
    })}</div>
    <Card className="flow-card"><SectionTitle title="Alur penerimaan RT" subtitle="State machine per timestamp. Lab test adalah gerbang antrean." action={<span className="small muted flow-hint"><span className="status-dot" />Snapshot {now}</span>} /><ol className="stage-flow">{scenario.stages.map((stage, i) => <li key={stage.id}><a href={stage.id === "stored" ? "#aset" : "#antrean-rt"} className={`flow-step ${stage.tone}`}><span className="flow-icon"><Icon icon={stageIcons[i]} size={20} /></span><span><strong>{stage.label} <span className="stage-count">{stage.count}</span></strong><span className="flow-status"><span className="status-dot" />{stage.status}</span></span></a></li>)}</ol></Card>
    <div className="monitor-middle">
      <section className="incident-card" id="peringatan"><div className="incident-top"><span className="incident-status"><Icon icon={TriangleAlert} size={17} />Rencana shift</span><span className="mono">PLAN-FIFO</span></div><h2>{receivingHeadline(check, demo.decisions, scenario.incident)}</h2><div className="incident-time"><span><Icon icon={Hourglass} size={15} />{scenario.incident.rt} tersisa</span><strong>{duration(Math.max(0, scenario.incident.holdingLeftMin))} <span>holding</span></strong></div><p className="inverse-muted">{scenario.incident.summary} {approved ? `Disetujui ${approved.by} pukul ${approved.at}; koordinator receiving tinggal mengonfirmasi instruksi.` : "Periksa rencana sebelum RT berikutnya tiba."}</p><div className="incident-factors">{scenario.incident.factors.map((factor, i) => <button key={factor.sourceId} onClick={() => setSource(factor.sourceId)}><Icon icon={[FlaskConical, Container, Hourglass][i] ?? Hourglass} size={15} />{factor.label}<ArrowUpRight size={13} aria-hidden /></button>)}</div><Link href="/rencana" className="button inverse">Periksa kelayakan rencana<span className="button-circle"><Icon icon={ArrowUpRight} /></span></Link></section>
      <section className="panel tank-panel" id="aset"><SectionTitle title="Bay dan Raw Milk Buffer" subtitle="Kesiapan bay, level tangki, dan suhu." action={<Link className="icon-button" aria-label="Buka halaman Bay dan Tangki" href="/tangki"><Icon icon={ArrowUpRight} /></Link>} /><div className="tanks-grid assets-grid">{scenario.assets.map(asset => <div className="tank-card" key={asset.id}><div className="tank-top"><span className="tank-id"><Icon icon={asset.kind === "Bay" ? Truck : Container} size={18} /><span className="mono">{asset.id}</span></span><Badge tone={asset.tone}>{asset.status}</Badge></div><p className="tank-volume">{number(asset.fill)}<span> / {number(asset.capacity)} {asset.unit}</span></p><div className={`capacity-bar ${asset.tone}`} role="meter" aria-label={`${asset.id}: ${asset.status}`} aria-valuenow={asset.fill} aria-valuemin={0} aria-valuemax={asset.capacity}><span style={{ width: `${asset.fill / asset.capacity * 100}%` }} /></div><div className="tank-footer"><span>{asset.kind === "Bay" ? <Clock3 size={13} strokeWidth={1.75} aria-hidden /> : <Thermometer size={13} strokeWidth={1.75} aria-hidden />}{asset.info}</span><button aria-label={`Lihat sumber ${asset.id}`} onClick={() => setSource(asset.source)}>Sumber<Icon icon={ArrowUpRight} size={13} /></button></div></div>)}</div></section>
    </div>
    <div className="monitor-bottom">
      <Card id="antrean-rt" className="truck-card"><SectionTitle title="Antrean Road Tanker" subtitle="Waktu tunggu per tahap dan umur susu terhadap batas holding time." action={<label className="filter-select"><span className="sr-only">Filter tahap RT</span><select value={filter} onChange={e => setFilter(e.target.value)}>{stages.map(s => <option key={s} value={s}>{s}</option>)}</select><Icon icon={ChevronDown} size={14} /></label>} /><div className="table-wrap"><table><thead><tr><th>RT / Farm</th><th className="numeric">Volume</th><th>Tahap</th><th className="numeric">Tunggu</th><th className="numeric">Umur susu</th><th className="numeric">Suhu</th><th><span className="sr-only">Bukti</span></th></tr></thead><tbody>{tankers.map(rt => <tr key={rt.id}><td><strong className="mono">{rt.id}</strong><span className="table-sub">{rt.farm}</span></td><td data-label="Volume" className="numeric">{number(rt.volume)} L</td><td data-label="Tahap"><Badge tone={rt.tone}>{rt.stage}</Badge></td><td data-label="Tunggu" className="numeric">{rt.wait} mnt</td><td data-label="Umur susu" className={`numeric ${rt.tone === "crit" ? "crit-text" : ""}`}>{rt.age}</td><td data-label="Suhu" className="numeric">{number(rt.temperature)} °C</td><td className="table-action"><button className="icon-button" aria-label={`Lihat bukti ${rt.id}`} onClick={() => setSource(rt.source)}><Icon icon={ArrowUpRight} size={16} /></button></td></tr>)}</tbody></table></div><div className="table-footer"><span>{tankers.length} dari {scenario.tankers.length} RT di plant · batas holding {Math.floor(demo.limits.holdingMin / 60)}j {String(demo.limits.holdingMin % 60).padStart(2, "0")}m [asumsi]</span><Link href="/rencana" className="text-link">Susun ulang antrean<Icon icon={ArrowRight} size={14} /></Link></div></Card>
      <Card className="qc-chart"><SectionTitle title="Tunggu lab test" subtitle="Rata-rata per jam, dalam menit." action={<button className="icon-button" aria-label="Lihat sumber grafik lab test" onClick={() => setSource("LAB-QUEUE")}><Icon icon={ArrowUpRight} /></button>} /><div className="chart-summary"><strong>{scenario.labSummary.avgMinutes}<span>menit</span></strong><span className="brand-text"><Icon icon={ArrowUpRight} size={15} />{scenario.labSummary.deltaMinutes} menit</span></div><div className="bar-chart" role="img" aria-label={`Tunggu lab test: ${scenario.labHistory.map(h => `${h.hour} ${h.minutes}`).join(", ")} menit`}><div className="chart-grid"><span>60</span><span>40</span><span>20</span><span>0</span></div><div className="chart-bars">{scenario.labHistory.map((hour, i) => <div className="bar-column" key={hour.hour}><div className={`chart-bar ${i === scenario.labHistory.length - 1 ? "current" : ""}`} style={{ height: `${hour.minutes / 60 * 100}%` }}><span>{hour.minutes}</span></div><span className="bar-label">{hour.hour.slice(0, 2)}</span></div>)}</div></div><div className="chart-legend"><span><i className="legend-square neutral" />Jam sebelumnya</span><span><i className="legend-square accent" />Jam ini</span></div><SourceButton id="LAB-QUEUE" onSelect={setSource} compact /></Card>
    </div><SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
