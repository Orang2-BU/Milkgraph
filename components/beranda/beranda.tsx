"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ChevronRight, Container, FlaskConical, Hourglass, PackageX, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import { scenario } from "@/lib/data";
import { duration } from "@/lib/format";
import { useDemo } from "@/lib/demo";
import { navigation } from "@/lib/nav";
import { ROLES } from "@/lib/roles";
import { holdingLeft, violations } from "@/lib/rules";
import { dataSources, farms, fillers, labResults, pastLog } from "@/mock/ops";
import { BOTTLENECKS } from "@/mock/site";
import type { Tone } from "@/mock/types";
import { Badge, Card, Icon, PageHeading, SectionTitle, SourceModal } from "@/components/ui";
import { MetricGrid } from "@/components/receiving/metric-grid";
import { ASSETS } from "@/lib/assets";

type Item = { icon: LucideIcon; title: string; meta: string; tone: Tone; href: string };
const plan = scenario.plans[0];
const forward = scenario.answers.find(a => a.id === "forward")!;


/** Beranda: KPI, hal yang perlu ditangani, lalu satu baris ringkasan per menu. Setiap baris membawa ke halaman detailnya. */
export function Beranda() {
  const [source, setSource] = useState<string | null>(null);
  const demo = useDemo();
  const me = ROLES[demo.role];
  const broken = violations(plan, "before", demo.limits);
  const after = violations(plan, "after", demo.limits);
  const approved = demo.decisions.find(d => d.plan === "current" && d.status === "approved");
  const left = Math.max(0, holdingLeft(demo.limits));
  const hold = demo.holds.find(h => h.trigger === scenario.qcEvent.lot && h.status !== "ditolak");
  const labPending = labResults.filter(r => r.kind === "penerimaan" && (r.status === "hasil-siap" || r.status === "uji-ulang") && !demo.labs[r.id]).length;
  const broke = fillers.filter(f => f.state === "breakdown");
  const bottlenecks = BOTTLENECKS[approved ? "after" : "before"];
  const arrived = farms.reduce((s, f) => s + f.arrived, 0);
  const plannedRt = farms.reduce((s, f) => s + f.plannedRt, 0);
  const connected = dataSources.filter(d => d.status === "terhubung").length;
  const bay = scenario.metrics[3];
  const lab = scenario.metrics[2];

  const watch = ASSETS.filter(a => a.tone === "crit" || a.tone === "warn").length;
  const summary: Record<string, { text: string; tone: Tone }> = {
    "Simulasi 3D": { text: `${bottlenecks.length} titik bottleneck di tata letak plant`, tone: bottlenecks.some(b => b.tone === "crit") ? "crit" : "neutral" },
    Penerimaan: { text: `${scenario.tankers.length} RT di plant, ${labPending} hasil lab menunggu QA, tiba ${arrived} dari ${plannedRt} RT`, tone: labPending ? "warn" : "neutral" },
    Operasional: { text: `${watch} alat perlu diperhatikan${broke.length ? `, ${broke.map(f => f.id).join(", ")} breakdown` : ""}`, tone: broke.length ? "crit" : watch ? "warn" : "neutral" },
    Rencana: { text: `${broken} constraint dilanggar, ${after} dengan rekomendasi solver`, tone: broken ? "crit" : "neutral" },
    Traceability: { text: `${scenario.qcEvent.lot} out-of-spec, ${forward.lots!.length} lot terdampak, ${hold ? hold.id : "hold belum diajukan"}`, tone: hold ? "warn" : "crit" },
    Pengaturan: { text: `${connected} dari ${dataSources.length} sumber data terhubung`, tone: connected < dataSources.length ? "warn" : "neutral" },
  };

  const attention: Item[] = [
    ...(!approved ? [{ icon: Hourglass, title: "RT-26 mendekati batas holding time", meta: `Sisa ${duration(left)}, masih menunggu bay`, tone: "crit" as Tone, href: "/receiving" }] : []),
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
        <div className="incident-time"><span><Icon icon={Hourglass} size={15} />Sisa holding time RT-26</span><strong>{duration(left)}</strong></div>
        <p className="inverse-muted">{approved ? `Disetujui ${approved.by}, ${approved.at}.` : `Lab test ${lab.value} ${lab.unit} dan ${bay.delta}.`}</p>
        <Link href="/rencana" className="button inverse">{approved ? "Lihat rencana" : "Periksa rencana"}<span className="button-circle"><Icon icon={ArrowUpRight} /></span></Link>
      </section>
      <Card className="home-attention"><SectionTitle title="Perlu perhatian" action={<Badge tone="crit">{attention.filter(a => a.tone === "crit").length} kritis</Badge>} />
        <ul className="attention-list">{attention.map(a => <li key={a.title}><Link href={a.href} className={`attention-item ${a.tone}`}><span className="attention-icon"><Icon icon={a.icon} size={18} /></span><span className="attention-copy"><strong>{a.title}</strong><span>{a.meta}</span></span><Icon icon={ChevronRight} size={18} /></Link></li>)}</ul>
      </Card>
    </div>

    {/* Isi tiap menu diringkas jadi satu baris (poin 7): detailnya ada di halaman menu masing-masing. */}
    <Card className="home-menus"><SectionTitle title="Semua menu" subtitle="Satu baris per menu. Klik untuk membuka halamannya." />
      <ul className="attention-list menu-list">{navigation.filter(n => summary[n.label]).map(n => { const m = summary[n.label]; return <li key={n.label}><Link href={n.tabs[0].href} className={`attention-item ${m.tone}`}><span className="attention-icon"><Icon icon={n.icon} size={18} /></span><span className="attention-copy"><strong>{n.label}</strong><span>{m.text}</span></span><Icon icon={ChevronRight} size={18} /></Link></li>; })}</ul>
    </Card>

    <Card className="home-activity"><SectionTitle title="Aktivitas terbaru" action={<Link className="text-link" href="/persetujuan">Semua riwayat<Icon icon={ChevronRight} size={14} /></Link>} />
      <ul className="activity-list">{[...demo.log, ...pastLog].slice(0, 3).map(e => <li key={e.id}><span className={`status-dot tone-${e.tone}`} aria-hidden="true" /><span><strong>{e.title}</strong><span>{e.detail}</span><span>{e.by} · {e.at}</span></span></li>)}</ul>
    </Card>
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
