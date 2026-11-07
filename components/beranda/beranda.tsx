"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Box, CalendarClock, ChevronRight, CircleCheck, CircleX, Container, Factory, FlaskConical, GitBranch, Hourglass, PackageX, Settings, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import { scenario } from "@/lib/data";
import { duration, number } from "@/lib/format";
import { useDemo } from "@/lib/demo";
import { navigation } from "@/lib/nav";
import { ROLES } from "@/lib/roles";
import { evaluate, holdingLeft, starvation, violations, type ConstraintId } from "@/lib/rules";
import { dataSources, farms, fillers, labResults, pastLog, UNIT_STATE } from "@/mock/ops";
import { BOTTLENECKS } from "@/mock/site";
import type { Tone } from "@/mock/types";
import { Badge, Card, Icon, PageHeading, SectionTitle, SourceModal } from "@/components/ui";
import { MetricGrid } from "@/components/receiving/metric-grid";
import { Equipment } from "@/components/trace/equipment";

type Item = { icon: LucideIcon; title: string; meta: string; tone: Tone; href: string };
const plan = scenario.plans[0];
const forward = scenario.answers.find(a => a.id === "forward")!;
const lotPacks = forward.lots!.reduce((sum, l) => sum + l.packs, 0);
const tabsOf = (label: string) => navigation.find(n => n.label === label)!.tabs;

/** Kartu satu menu: fungsi menu dalam satu kalimat, cuplikan isinya, lalu pintasan ke setiap tab. */
function ModuleCard({ icon, menu, description, wide, children }: { icon: LucideIcon; menu: string; description: string; wide?: boolean; children: ReactNode }) {
  const tabs = tabsOf(menu);
  return <section className={`module-card ${wide ? "wide" : ""}`} aria-labelledby={`menu-${menu}`}>
    <header className="module-head"><span className="module-icon"><Icon icon={icon} size={22} /></span><div><h3 id={`menu-${menu}`}>{menu}</h3><p>{description}</p></div><Link className="button secondary module-open" href={tabs[0].href}>Buka<Icon icon={ArrowRight} size={16} /></Link></header>
    <div className="module-body">{children}</div>
    {tabs.length > 1 && <nav className="module-tabs" aria-label={`Isi menu ${menu}`}><span>Isi menu:</span>{tabs.map(t => <Link key={t.href} href={t.href}>{t.label}</Link>)}</nav>}
  </section>;
}

/** Beranda: KPI, hal yang perlu ditangani, lalu ringkasan isi setiap menu. Setiap baris membawa ke halaman detailnya. */
export function Beranda() {
  const [source, setSource] = useState<string | null>(null);
  const demo = useDemo();
  const me = ROLES[demo.role];
  const broken = violations(plan, "before", demo.limits);
  const after = violations(plan, "after", demo.limits);
  const checks = evaluate(plan, "before", demo.limits);
  const approved = demo.decisions.find(d => d.plan === "current" && d.status === "approved");
  const left = Math.max(0, holdingLeft(demo.limits));
  const hold = demo.holds.find(h => h.trigger === scenario.qcEvent.lot && h.status !== "ditolak");
  const labPending = labResults.filter(r => r.kind === "penerimaan" && (r.status === "hasil-siap" || r.status === "uji-ulang") && !demo.labs[r.id]).length;
  const labTesting = labResults.filter(r => r.status === "dalam-uji").length;
  const broke = fillers.filter(f => f.state === "breakdown");
  const fillCount = (Object.keys(UNIT_STATE) as (keyof typeof UNIT_STATE)[]).map(k => ({ k, n: fillers.filter(f => f.state === k).length })).filter(x => x.n);
  const bottlenecks = BOTTLENECKS[approved ? "after" : "before"];
  const arrived = farms.reduce((s, f) => s + f.arrived, 0);
  const plannedRt = farms.reduce((s, f) => s + f.plannedRt, 0);
  const connected = dataSources.filter(d => d.status === "terhubung").length;
  const bay = scenario.metrics[3];
  const lab = scenario.metrics[2];

  const attention: Item[] = [
    ...(!approved ? [{ icon: Hourglass, title: "RT-26 mendekati batas holding time", meta: `${duration(left)} tersisa, menunggu bay`, tone: "crit" as Tone, href: "/receiving" }] : []),
    hold ? { icon: PackageX, title: `${hold.id} ${hold.status === "diajukan" ? "menunggu keputusan QA" : hold.status === "aktif" ? "hold aktif" : "hold dilepas"}`, meta: `${hold.lots.length} lot dari ${scenario.qcEvent.lot}`, tone: hold.status === "diajukan" ? "warn" : "neutral", href: "/hold" }
      : { icon: FlaskConical, title: `${scenario.qcEvent.lot} QC out-of-spec`, meta: `${scenario.qcEvent.test}, perlu trace`, tone: "crit", href: "/trace" },
    ...broke.map(f => ({ icon: Wrench, title: `${f.id} breakdown`, meta: f.note, tone: "crit" as Tone, href: "/filling" })),
    ...(labPending ? [{ icon: FlaskConical, title: `${labPending} hasil lab menunggu rilis QA`, meta: "Lab test jadi gerbang antrean RT", tone: "warn" as Tone, href: "/lab" }] : []),
    { icon: Container, title: "Bay 2 sedang CIP", meta: bay.delta, tone: "warn", href: "/tangki" },
  ];

  return <div className="page-enter">
    <PageHeading title="Beranda" subtitle={`Halo, ${me.user.split(" ")[0]}. Ringkasan Shift Siang, ${scenario.date}, snapshot ${scenario.now}.`} />
    <MetricGrid onSource={setSource} />

    <div className="home-top">
      <section className="incident-card home-plan"><div className="incident-top"><span className="incident-status"><Icon icon={TriangleAlert} size={17} />Rencana shift</span><span className="mono">PLAN-FIFO</span></div>
        <h2>{approved ? <>Rekomendasi disetujui,<br />RT-26 pindah ke Bay 1.</> : <>Rencana tidak layak,<br />{broken} constraint dilanggar.</>}</h2>
        <div className="incident-time"><span><Icon icon={Hourglass} size={15} />RT-26 tersisa</span><strong>{duration(left)} <span>holding</span></strong></div>
        <p className="inverse-muted">{approved ? `Disetujui ${approved.by}, ${approved.at}.` : `Lab test ${lab.value} ${lab.unit} dan ${bay.delta}.`}</p>
        <Link href="/rencana" className="button inverse">{approved ? "Lihat rencana" : "Periksa rencana"}<span className="button-circle"><Icon icon={ArrowUpRight} /></span></Link>
      </section>
      <Card className="home-attention"><SectionTitle title="Perlu perhatian" action={<Badge tone="crit">{attention.filter(a => a.tone === "crit").length} kritis</Badge>} />
        <ul className="attention-list">{attention.map(a => <li key={a.title}><Link href={a.href} className={`attention-item ${a.tone}`}><span className="attention-icon"><Icon icon={a.icon} size={18} /></span><span className="attention-copy"><strong>{a.title}</strong><span>{a.meta}</span></span><Icon icon={ChevronRight} size={18} /></Link></li>)}</ul>
      </Card>
    </div>

    <div className="home-section-head"><h2>Isi setiap menu</h2><p>Ringkasan dan pintasan ke semua halaman.</p></div>
    <div className="module-grid">
      <ModuleCard icon={Factory} menu="Pabrik" description="Kondisi fisik plant saat ini: antrean road tanker, bay dan tangki, serta mesin filling." wide>
        <div className="module-cols">
          <div><h4>Antrean RT per tahap</h4><ol className="home-flow">{scenario.stages.map(s => <li key={s.id} className={s.tone}><strong>{s.count}</strong><span>{s.label}</span></li>)}</ol><p className="module-note">{scenario.tankers.length} RT di plant, tunggu lab {lab.value} {lab.unit}.</p></div>
          <div><h4>Bay dan tangki raw milk</h4><ul className="mini-bars">{scenario.assets.map(a => <li key={a.id}><span className="mono">{a.id}</span><span className={`capacity-bar ${a.tone}`}><span style={{ width: `${a.fill / a.capacity * 100}%` }} /></span><span className={`mini-status ${a.tone}`}>{a.status}</span></li>)}</ul></div>
          <div><h4>Lini filling</h4><ul className="line-chips">{fillers.map(f => <li key={f.id} className={UNIT_STATE[f.state].tone} title={`${f.id}: ${UNIT_STATE[f.state].label}, ${f.product}`}>{f.id}</li>)}</ul><p className="module-note">{fillCount.map(x => `${x.n} ${UNIT_STATE[x.k].label.toLowerCase()}`).join(" · ")}</p></div>
        </div>
      </ModuleCard>

      <ModuleCard icon={CalendarClock} menu="Rencana" description="Cek kelayakan rencana shift terhadap 6 constraint, bandingkan rekomendasi solver, lalu putuskan.">
        <ul className="check-list">{plan.constraints.map(c => { const r = checks[c.id as ConstraintId]; return <li key={c.id} className={r.ok ? "ok" : "crit"}><Icon icon={r.ok ? CircleCheck : CircleX} size={16} />{c.label}</li>; })}</ul>
        <dl className="compare-row"><div><dt>Constraint dilanggar</dt><dd>{broken} <ArrowRight size={14} aria-hidden /> <strong>{after}</strong></dd></div><div><dt>Starvation filling</dt><dd>{starvation(plan.before)} <ArrowRight size={14} aria-hidden /> <strong>{starvation(plan.after)}</strong> mnt</dd></div><div><dt>RT tiba hari ini</dt><dd><strong>{arrived}</strong> / {plannedRt}</dd></div></dl>
      </ModuleCard>

      <ModuleCard icon={GitBranch} menu="Traceability" description="Telusuri asal dan sebaran volume susu per lot, lalu kelola hasil lab dan hold.">
        <ol className="mini-chain" aria-label="Jalur genealogi FG-1013-07">{[["Farm", "Farm"], ["RT", "RT-04"], ["Buffer", "RMT-2"], ["Sterilisasi", "UHT-2"], ["Filling", "F2"], ["Lot", "FG-07"]].map(([kind, label]) => <li key={label}><Equipment kind={kind} size={40} /><span className="mono">{label}</span></li>)}</ol>
        <dl className="compare-row"><div><dt>QC out-of-spec</dt><dd><strong className="mono">{scenario.qcEvent.lot}</strong></dd></div><div><dt>Lot terdampak</dt><dd><strong>{forward.lots!.length}</strong> lot · {number(lotPacks)} pak</dd></div><div><dt>Hasil lab</dt><dd><strong>{labPending}</strong> menunggu · {labTesting} diuji</dd></div><div><dt>Hold</dt><dd>{hold ? <strong className="mono">{hold.id}</strong> : "Belum diajukan"}</dd></div></dl>
      </ModuleCard>

      <ModuleCard icon={Box} menu="Simulasi 3D" description="Model plant dari tata letak nyata: alur susu, kondisi aset, dan lokasi bottleneck.">
        <Link href="/simulasi" className="sim-thumb"><Image src="/beranda/simulasi-3d.jpg" alt="Cuplikan model 3D plant dengan penanda bottleneck" width={840} height={520} sizes="(max-width: 1199px) 100vw, 40vw" /></Link>
        <ul className="home-bottlenecks">{bottlenecks.map(b => <li key={b.title}><span className={`status-dot tone-${b.tone}`} aria-hidden="true" /><strong>{b.title}</strong><span>{b.text}</span></li>)}</ul>
      </ModuleCard>

      <ModuleCard icon={Settings} menu="Pengaturan" description="Sumber data yang terhubung secara read-only dan hak akses setiap peran.">
        <ul className="source-list">{dataSources.map(d => <li key={d.id}><span className={`status-dot tone-${d.status === "terhubung" ? "ok" : "warn"}`} aria-hidden="true" /><strong>{d.name}</strong><span>{d.status === "terhubung" ? `Sinkron ${d.lastSync}` : "Tertunda"}</span></li>)}</ul>
        <p className="module-note">{connected} dari {dataSources.length} sumber terhubung. Masuk sebagai {me.user}, {me.label}.</p>
      </ModuleCard>
    </div>

    <Card className="home-activity"><SectionTitle title="Aktivitas terbaru" action={<Link className="text-link" href="/persetujuan">Semua riwayat<Icon icon={ChevronRight} size={14} /></Link>} />
      <ul className="activity-list">{[...demo.log, ...pastLog].slice(0, 4).map(e => <li key={e.id}><span className={`status-dot tone-${e.tone}`} aria-hidden="true" /><span><strong>{e.title}</strong><span>{e.detail}</span><span>{e.by} · {e.at}</span></span></li>)}</ul>
    </Card>
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
