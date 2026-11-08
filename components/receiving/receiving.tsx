"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarClock, Droplets, FlaskConical, Hourglass, MapPin, PackageCheck, PackageOpen, ShieldCheck, TriangleAlert, Truck } from "lucide-react";
import { scenario } from "@/lib/data";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { apiSend } from "@/lib/api/client";
import { receivingHeadline } from "./api-view";
import type { Scenario } from "@/mock/types";
import { duration, number } from "@/lib/format";
import { useDemo } from "@/lib/demo";
import { holdingLeft, violations } from "@/lib/rules";
import { Badge, Card, Icon, SectionTitle, SourceModal, Toggle } from "@/components/ui";
import { Select } from "@/components/ui/fields";
import { MetricGrid } from "./metric-grid";
import { Queue3D } from "./queue-3d";
import { queueLayout } from "./queue-layout";

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
    void apiSend<CheckResult>("POST", "/plans/current/check", {}, demo.role)
      .then(value => { if (live) setChecked(value); })
      .catch(error => { if (live) setCheckError(error); });
    return () => { live = false; };
  }, [demo.role, demo.limits]);

  const data = API_MODE ? receiving.data : {
    ...scenario,
    labSummary: { avgMinutes: 52, deltaMinutes: 14 },
    incident: {
      rt: "RT-26",
      holdingLeftMin: holdingLeft(demo.limits),
      summary: "Antrean RT menumpuk karena lab test lama dan Bay 2 sedang CIP.",
      factors: [
        { label: "Lab test 52 menit", sourceId: "LAB-QUEUE" },
        { label: "Bay 2 CIP sampai 15.20", sourceId: "CIP-B2" },
        { label: "Holding time RT-26", sourceId: "HOLD-RT26" },
      ],
    },
  };

  if (!data || (API_MODE && (!meta.data || !checked))) {
    const error = receiving.error ?? meta.error ?? checkError;
    return <div className="page-enter" role="status">{error ? `Gagal memuat antrean truk: ${error.message}` : "Memuat antrean truk…"}</div>;
  }

  return (
    <ReceivingContent
      data={data}
      now={API_MODE ? meta.data!.now : scenario.now}
      demo={demo}
      check={API_MODE ? checked! : { violations: { before: violations(scenario.plans[0], "before", demo.limits) } }}
      source={source}
      setSource={setSource}
      filter={filter}
      setFilter={setFilter}
    />
  );
}

function ReceivingContent({
  data: scenarioData,
  now,
  demo,
  check,
  source,
  setSource,
  filter,
  setFilter,
}: {
  data: ReceivingData;
  now: string;
  demo: ReturnType<typeof useDemo>;
  check: CheckResult;
  source: string | null;
  setSource: (id: string | null) => void;
  filter: string;
  setFilter: (v: string) => void;
}) {
  const stages = ["Semua tahap", ...new Set(scenarioData.tankers.map(t => t.stage))];
  const approved = demo.decisions.find(d => d.plan === "current" && d.status === "approved");
  const tankers = scenarioData.tankers.filter(t => filter === stages[0] || t.stage === filter);
  // Next phase PDF: antrean juga bisa dilihat dalam 3D, dari data yang sama dengan tabel.
  const [mode, setMode] = useState<"tabel" | "3d">("tabel");
  const [picked, setPicked] = useState<string | null>(null);
  const layout = useMemo(() => {
    const bays = scenarioData.assets.filter(a => a.kind === "Bay").map(a => ({ id: a.id, status: a.status, tone: a.tone, note: a.info }));
    const at = Object.fromEntries(bays.flatMap(b => { const rt = b.status.match(/RT-\d+/)?.[0]; return rt ? [[rt, b.id]] : []; }));
    return queueLayout(scenarioData.tankers, scenarioData.stages.find(st => st.id === "otw")?.count ?? 0, bays, at);
  }, [scenarioData]);
  const pickedRt = scenarioData.tankers.find(t => t.id === picked);

  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <h1>Antrean Truk</h1>
          <p>Alur RT dari farm sampai tangki, diperbarui {now}</p>
        </div>
        <div className="page-actions">
          <Link className="button primary" href="/rencana">
            <Icon icon={CalendarClock} />Periksa rencana<Icon icon={ArrowUpRight} size={16} />
          </Link>
        </div>
      </div>
      <MetricGrid metrics={scenarioData.metrics} onSource={setSource} />
      <Card className="flow-card">
        <SectionTitle title="Alur penerimaan RT" action={<span className="small muted flow-hint"><span className="status-dot" />Snapshot {now}</span>} />
        <ol className="stage-flow">
          {scenarioData.stages.map((stage, i) => (
            <li key={stage.id}>
              <a href={stage.id === "stored" ? "/tangki" : "#antrean-rt"} className={`flow-step ${stage.tone}`}>
                <span className="flow-icon"><Icon icon={stageIcons[i]} size={20} /></span>
                <span>
                  <strong>{stage.label} <span className="stage-count">{stage.count}</span></strong>
                  <span className="flow-status"><span className="status-dot" />{stage.status}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </Card>
      <div className={`monitor-bottom ${mode === "3d" ? "wide" : ""}`}>
        <Card id="antrean-rt" className="truck-card">
          <SectionTitle
            title="Antrean Road Tanker"
            action={<div className="page-actions"><Toggle label="Tampilan antrean" value={mode} onChange={m => { setMode(m); setPicked(null); }} options={[{ value: "tabel", label: "Tabel" }, { value: "3d", label: "Antrean 3D" }]} />{mode === "tabel" && <Select compact label="Filter tahap RT" value={filter} onChange={setFilter} options={stages.map(s => ({ value: s, label: s }))} />}</div>}
          />
          {mode === "3d" ? <>
            <Queue3D tankers={scenarioData.tankers} assets={scenarioData.assets} layout={layout} picked={picked} onPick={setPicked} label="Antrean road tanker dalam 3D, dari kedatangan sampai bay bongkar" />
            {pickedRt ? <div className="queue-detail">
              <div><strong className="mono">{pickedRt.id}</strong> <span className="muted">{pickedRt.farm}</span></div>
              <Badge tone={pickedRt.tone}>{pickedRt.stage}</Badge>
              <span>{number(pickedRt.volume)} L</span><span>Tunggu {pickedRt.wait} mnt</span><span className={pickedRt.tone === "crit" ? "crit-text" : ""}>Umur susu {pickedRt.age}</span><span>{number(pickedRt.temperature)} °C</span>
              <button className="text-link" onClick={() => setSource(pickedRt.source)}>Lihat bukti<Icon icon={ArrowUpRight} size={14} /></button>
            </div> : <p className="small muted queue-hint">Klik truk untuk melihat rinciannya. Denyut merah: RT mendekati batas holding time. Seret untuk menggeser, klik kanan untuk memutar.</p>}
          </> : <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>RT / Farm</th>
                  <th className="numeric">Volume</th>
                  <th>Tahap</th>
                  <th className="numeric">Tunggu</th>
                  <th className="numeric">Umur susu</th>
                  <th className="numeric">Suhu</th>
                  <th><span className="sr-only">Bukti</span></th>
                </tr>
              </thead>
              <tbody>
                {tankers.map(rt => (
                  <tr key={rt.id}>
                    <td><strong className="mono">{rt.id}</strong><span className="table-sub">{rt.farm}</span></td>
                    <td data-label="Volume" className="numeric">{number(rt.volume)} L</td>
                    <td data-label="Tahap"><Badge tone={rt.tone}>{rt.stage}</Badge></td>
                    <td data-label="Tunggu" className="numeric">{rt.wait} mnt</td>
                    <td data-label="Umur susu" className={`numeric ${rt.tone === "crit" ? "crit-text" : ""}`}>{rt.age}</td>
                    <td data-label="Suhu" className="numeric">{number(rt.temperature)} °C</td>
                    <td className="table-action">
                      <button className="icon-button" aria-label={`Lihat bukti ${rt.id}`} onClick={() => setSource(rt.source)}>
                        <Icon icon={ArrowUpRight} size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
          <div className="table-footer">
            <span>{tankers.length} dari {scenarioData.tankers.length} RT di plant. Batas holding time {duration(demo.limits.holdingMin)} [asumsi].</span>
            <Link href="/rencana" className="text-link">Susun ulang antrean<Icon icon={ArrowRight} size={14} /></Link>
          </div>
        </Card>
        <section className="incident-card" id="peringatan">
          <div className="incident-top">
            <span className="incident-status"><Icon icon={TriangleAlert} size={17} />Rencana shift</span>
            <span className="mono">PLAN-FIFO</span>
          </div>
          <h2>{receivingHeadline(check, demo.decisions, scenarioData.incident)}</h2>
          <div className="incident-time">
            <span><Icon icon={Hourglass} size={15} />Sisa holding time {scenarioData.incident.rt}</span>
            <strong>{duration(Math.max(0, scenarioData.incident.holdingLeftMin))}</strong>
          </div>
          <p className="inverse-muted">
            {scenarioData.incident.summary} {approved ? `Disetujui ${approved.by} pukul ${approved.at}. Koordinator receiving tinggal mengonfirmasi instruksinya.` : "Periksa rencana sebelum RT berikutnya tiba."}
          </p>
          <div className="incident-factors">
            {scenarioData.incident.factors.map(factor => (
              <button key={factor.sourceId} onClick={() => setSource(factor.sourceId)}>
                <FlaskConical size={15} strokeWidth={1.75} aria-hidden />
                {factor.label}
                <ArrowUpRight size={13} aria-hidden />
              </button>
            ))}
          </div>
          <p className="incident-links">Rincian tunggu lab ada di <Link href="/lab">Tes Lab</Link>, dan kondisi bay di <Link href="/tangki">Bay &amp; Tangki</Link>.</p>
          <Link href="/rencana" className="button inverse">
            Periksa kelayakan rencana<span className="button-circle"><Icon icon={ArrowUpRight} /></span>
          </Link>
        </section>
      </div>
      <SourceModal id={source} onClose={() => setSource(null)} />
    </div>
  );
}
