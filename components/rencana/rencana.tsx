"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, CheckCheck, CircleCheck, CircleHelp, CircleX, Clock3, Cpu, History, Lock, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { scenario } from "@/lib/data";

import { Badge, Card, Icon, Modal, SectionTitle, SourceButton, SourceModal, Timeline, Toggle } from "@/components/ui";
import { decidePlan, useDemo } from "@/lib/demo";
import { can, whoCan } from "@/lib/roles";
import { DEFAULT_LIMITS, evaluate, starvation, type ConstraintId } from "@/lib/rules";
import { API_MODE, apiSend } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import type { Block } from "@/mock/types";

const DEFAULT_RESOURCES = ["Lab test", "Bay 1", "Bay 2", "Bay 3", "Filling F1", "Filling F2", "Filling F4"];

type PlanCheckVerdict = { ok: boolean; text: string };
type PlanCheckResult = {
  before: Record<string, PlanCheckVerdict>;
  after: Record<string, PlanCheckVerdict>;
  violations: { before: number; after: number };
  starvation: { before: number; after: number };
  holdingLeft: number;
};

type PlanItem = {
  id: string;
  label: string;
  detail: string;
  solveTime: string;
  turnaround: [string, string];
  queue: [number, number];
  before: { resource: string; label: string; start: number; end: number; type: string; source?: string }[];
  after: { resource: string; label: string; start: number; end: number; type: string; source?: string }[];
  constraints: { id: string; label: string; source: string }[];
  reasons: { title: string; text: string; source: string }[];
  resources?: string[];
  horizon?: { start: string; end: string };
  queueLabel?: string;
};

export function Rencana() {
  const [planId, setPlanId] = useState("current");
  const [view, setView] = useState<"before" | "after">("before");
  const [dialog, setDialog] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const demo = useDemo();
  const plansResource = useResource<PlanItem[]>(API_MODE ? "/plans" : null);
  const [apiCheck, setApiCheck] = useState<PlanCheckResult | null>(null);
  const [checkError, setCheckError] = useState<Error | null>(null);

  useEffect(() => {
    if (!API_MODE) return;
    let live = true;
    void apiSend<PlanCheckResult>("POST", `/plans/${planId}/check`, {}, demo.role)
      .then(res => { if (live) { setApiCheck(res); setCheckError(null); } })
      .catch(err => { if (live) setCheckError(err instanceof Error ? err : new Error(String(err))); });
    return () => { live = false; };
  }, [planId, demo.role, demo.limits]);

  if (API_MODE) {
    if (plansResource.loading || (!plansResource.data && !plansResource.error) || (!apiCheck && !checkError)) {
      return <div className="page-enter" role="status">Memuat data Rencana & What-if…</div>;
    }
    const err = plansResource.error || checkError;
    if (err) {
      return <div className="page-enter" role="status">Gagal memuat Rencana & What-if: {err.message}</div>;
    }
    if (!plansResource.data || plansResource.data.length === 0) {
      return <div className="page-enter" role="status">Tidak ada rencana tersedia.</div>;
    }
  }

  const plans = API_MODE ? plansResource.data! : scenario.plans;
  const plan = plans.find(p => p.id === planId) ?? plans[0];
  const decision = demo.decisions.find(d => d.plan === planId);
  const allowed = can(demo.role, "plan.decide");

  const mockPlan = !API_MODE ? scenario.plans.find(p => p.id === planId)! : null;
  const mockChecks = mockPlan ? {
    before: evaluate(mockPlan, "before", demo.limits),
    after: evaluate(mockPlan, "after", demo.limits),
  } : null;

  const violated = (v: "before" | "after") => {
    if (API_MODE) {
      return apiCheck?.violations[v] ?? 0;
    }
    return Object.values(mockChecks![v]).filter(c => !c.ok).length;
  };

  const planAny = plan as unknown as PlanItem;
  const starvationBefore = API_MODE ? (apiCheck?.starvation.before ?? 0) : starvation(plan.before as unknown as Block[]);
  const starvationAfter = API_MODE ? (apiCheck?.starvation.after ?? 0) : starvation(plan.after as unknown as Block[]);

  const changed = JSON.stringify(demo.limits) !== JSON.stringify(DEFAULT_LIMITS);
  const queueLabel = planAny.queueLabel ?? "RT antre di plant 16.00";
  const metrics = [
    { label: "Constraint dilanggar", before: `${violated("before")}`, after: `${violated("after")}`, unit: "dari 6", source: "SOLVER-01" },
    { label: "Waktu putar RT", before: plan.turnaround[0], after: plan.turnaround[1], unit: "rata-rata [simulasi]", source: "TURN-01" },
    { label: "Starvation filling", before: `${starvationBefore}`, after: `${starvationAfter}`, unit: "menit", source: "FLOW-F2" },
    { label: queueLabel, before: `${plan.queue[0]}`, after: `${plan.queue[1]}`, unit: "RT [simulasi]", source: "PLAN-FIFO" },
  ];
  const blocks = plan[view];
  const resources = planAny.resources ?? DEFAULT_RESOURCES;
  const horizonText = planAny.horizon ? `Horizon ${planAny.horizon.start} - ${planAny.horizon.end}` : "Horizon 13.00 - 20.00";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dialog || (dialog === "rejected" && !note.trim()) || submitting) return;
    setActionError(null);
    setSubmitting(true);
    try {
      await decidePlan(planId, plan.label, dialog, note.trim());
      setDialog(null);
      setNote("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }
  return <div className="page-enter"><div className="page-heading"><div><h1>Rencana & What-if</h1><p>Cek kelayakan rencana terhadap constraint, lalu susun ulang antrean.</p></div><div className="page-actions"><button className="button secondary" disabled={!!decision || !allowed || submitting} title={allowed ? undefined : whoCan("plan.decide")} onClick={() => { setNote(""); setActionError(null); setDialog("rejected"); }}><Icon icon={X} size={16} />Tolak</button><button className="button primary" disabled={!!decision || !allowed || submitting} title={allowed ? undefined : whoCan("plan.decide")} onClick={() => { setNote(""); setActionError(null); setDialog("approved"); }}><Icon icon={CheckCheck} />Setujui rekomendasi</button></div></div>
    {actionError && <div className="decision-banner warn" role="alert"><Icon icon={X} /><span><strong>Gagal memproses keputusan</strong><span>{actionError}</span></span></div>}
    <div className="scenario-bar"><Toggle label="Pilih skenario" value={planId} onChange={id => { setPlanId(id); setView("before"); }} options={plans.map(p => ({ value: p.id, label: p.label }))} /><span className="small muted"><Icon icon={Clock3} size={15} />{horizonText}</span></div>
    {decision && <div className={`decision-banner ${decision.status === "approved" ? "ok" : "warn"}`} role="status"><Icon icon={decision.status === "approved" ? ShieldCheck : X} /><span><strong>{decision.status === "approved" ? "Disetujui" : "Ditolak"} oleh {decision.by}, {decision.at}</strong><span>{decision.note || "Tanpa catatan tambahan."} {decision.status === "approved" ? "Instruksi dikirim ke koordinator receiving dan supervisor produksi." : "Rencana awal tetap berlaku."}</span></span></div>}
    <section className="recommendation-card"><div className="section-heading"><div><h2>{violated("after") ? `Rekomendasi solver: ${violated("after")} constraint masih dilanggar` : "Rekomendasi solver: rencana layak"}</h2><p>{plan.detail} {violated("after") ? "Batas constraint sudah diubah, jadi rekomendasi perlu dihitung ulang solver [di luar mockup]." : "Rekomendasi belum berlaku sebelum disetujui planner."}</p></div><button className="recommendation-saving" onClick={() => setSource("SOLVER-01")}><Icon icon={Cpu} size={17} />CP-SAT · {plan.solveTime}</button></div><div className="comparison-grid">{metrics.map(metric => <div key={metric.label} className="comparison-metric"><div><span>{metric.label}</span><button className="source-help" aria-label={`Dasar ${metric.label}`} onClick={() => setSource(metric.source)}><Icon icon={CircleHelp} size={15} /></button></div><div className="comparison-values"><span>{metric.before}</span><Icon icon={ArrowRight} size={16} /><strong>{metric.after}</strong></div><span className="small inverse-muted">{metric.unit}</span></div>)}</div><div className="recommendation-note"><Icon icon={ShieldCheck} size={15} /><span>{decision ? "Keputusan demo tercatat. Tidak mengendalikan bay atau mesin nyata." : allowed ? "Menunggu persetujuan planner. Rencana belum diterapkan." : `Menunggu persetujuan planner. ${whoCan("plan.decide")}`}</span><button onClick={() => setSource("PLAN-FIFO")}>Lihat rencana awal<Icon icon={ArrowUpRight} size={14} /></button></div></section>
    <Card className="constraint-card"><SectionTitle title="Pemeriksaan kelayakan" subtitle={changed ? "Diuji dengan batas yang diubah di halaman Constraint." : "Enam constraint studi kasus diambil dari graph dan diuji pada kedua rencana."} action={<div className="page-actions"><Badge tone={violated("before") ? "crit" : "ok"}>{violated("before")} dilanggar di rencana awal</Badge><Link className="text-link" href="/constraint"><Icon icon={SlidersHorizontal} size={15} />Atur batas</Link></div>} /><div className="table-wrap"><table className="constraint-table"><thead><tr><th>Constraint</th><th>Rencana awal (FIFO)</th><th>Rekomendasi solver</th><th><span className="sr-only">Bukti</span></th></tr></thead><tbody>{plan.constraints.map(c => <tr key={c.id}><td><strong>{c.label}</strong></td>{(["before", "after"] as const).map(v => { const r = API_MODE ? (apiCheck?.[v]?.[c.id] ?? { ok: false, text: "Memuat..." }) : mockChecks![v][c.id as ConstraintId]; return <td key={v} data-label={v === "before" ? "Rencana awal" : "Rekomendasi"}><span className={`check ${r.ok ? "ok" : "crit"}`}><Icon icon={r.ok ? CircleCheck : CircleX} size={16} /><span><strong>{r.ok ? "Terpenuhi" : "Dilanggar"}</strong>{r.text}</span></span></td>; })}<td className="table-action"><button className="icon-button" aria-label={`Lihat bukti ${c.label}`} onClick={() => setSource(c.source)}><Icon icon={ArrowUpRight} size={16} /></button></td></tr>)}</tbody></table></div></Card>
    <Card className="gantt-card"><SectionTitle title="Antrean lab, bay, dan filling" subtitle={view === "before" ? "Rencana awal. Blok merah melanggar constraint." : "Rekomendasi solver setelah penyusunan ulang."} action={<Toggle label="Tampilan rencana" value={view} onChange={setView} options={[{ value: "before", label: "Rencana awal" }, { value: "after", label: "Rekomendasi" }]} />} /><Timeline blocks={blocks as unknown as Block[]} resources={resources} onSource={setSource} /><div className="gantt-legend">{[{ c: "lab", t: "Lab test" }, { c: "unload", t: "Bongkar RT" }, { c: "cip", t: "CIP" }, { c: "process", t: "Filling" }, { c: "changeover", t: "Changeover" }, { c: "starvation", t: "Starvation" }, { c: "violation", t: "Melanggar constraint" }].map(l => <span key={l.c}><i className={`legend-square ${l.c}`} />{l.t}</span>)}</div><p className="small muted">Ketergantungan dua arah: AT-2 melayani F2 dan F4, jadi saat AT-2 kosong kedua lini berhenti; sebaliknya filling yang tersendat menahan aseptic tank sampai RT menumpuk di unloading. <button className="inline-link" onClick={() => setSource("FLOW-F2")}>Lihat pasokan F2</button></p></Card>
    <div className="schedule-bottom"><Card><SectionTitle title="Mengapa antrean berubah?" subtitle="Setiap perubahan memiliki alasan dan sumber yang dapat diperiksa." action={<span className="recommendation-saving light"><Icon icon={ArrowDownRight} size={16} />{starvationBefore - starvationAfter} menit starvation</span>} /><ol className="factor-list reasons">{plan.reasons.map((reason, i) => <li key={reason.title}><span className="factor-number">{i + 1}</span><div><h3>{reason.title}</h3><p>{reason.text}</p><SourceButton id={reason.source} onSelect={setSource} /></div></li>)}</ol></Card><Card className="approval-card"><SectionTitle title="Keputusan planner" subtitle="Persetujuan berlaku per skenario." /><div className="approval-state"><span className="placeholder-symbol"><Icon icon={decision ? CheckCheck : ShieldCheck} size={28} /></span><h3>{decision ? decision.status === "approved" ? "Rekomendasi disetujui" : "Rekomendasi ditolak" : allowed ? "Kendali tetap di tanganmu" : "Menunggu planner"}</h3><p>{decision ? "Keputusan tercatat di Riwayat Persetujuan." : allowed ? "Periksa constraint dan alasan perubahan, lalu setujui atau tolak melalui tombol di atas." : whoCan("plan.decide")}</p><Badge tone={decision?.status === "approved" ? "ok" : "neutral"}>{decision ? "Keputusan tercatat" : "Belum diterapkan"}</Badge></div><div className="approval-history"><h3>Keputusan rencana</h3>{demo.decisions.length ? demo.decisions.map(item => <div className="history-item" key={item.plan}><Icon icon={item.status === "approved" ? Check : X} size={16} /><div><strong>{item.status === "approved" ? "Disetujui" : "Ditolak"} · {item.at}</strong><p>{plans.find(p => p.id === item.plan)?.label ?? item.plan}</p><p>{item.note || "Tanpa catatan"}</p><span className="small muted">{item.by}</span></div></div>) : <p className="small muted">Belum ada keputusan pada demo ini.</p>}</div><Link className="button secondary wide reset-demo" href="/persetujuan"><Icon icon={History} size={16} />Buka riwayat persetujuan</Link>{!allowed && <p className="small muted with-icon"><Icon icon={Lock} size={13} />Ganti peran lewat kartu akun di sidebar.</p>}</Card></div>
    {dialog && <Modal title={dialog === "approved" ? "Setujui rekomendasi solver?" : "Tolak rekomendasi solver?"} onClose={() => setDialog(null)}><form onSubmit={submit}><Badge>Data simulasi</Badge><p className="dialog-summary">{plan.label}. {dialog === "approved" ? `Pelanggaran constraint turun dari ${violated("before")} menjadi ${violated("after")}. Antrean RT dan bay mengikuti rekomendasi setelah disetujui.` : "Rencana awal tetap berlaku. Catatan diperlukan agar alasan keputusan dapat ditelusuri."}</p><label className="field-label" htmlFor="decision-note">Catatan {dialog === "rejected" ? "(wajib)" : "(opsional)"}</label><textarea id="decision-note" value={note} onChange={e => setNote(e.target.value)} required={dialog === "rejected"} placeholder={dialog === "rejected" ? "Tuliskan alasan penolakan..." : "Contoh: informasikan koordinator receiving untuk pindah RT-26 ke Bay 1."} maxLength={500} /><p className="small muted">{note.length}/500 karakter · dicatat atas nama peran aktif</p>{actionError && <p className="small crit-text" role="alert">{actionError}</p>}<div className="dialog-actions"><button type="button" className="button secondary" onClick={() => setDialog(null)}>Batal</button><button className="button primary" disabled={(dialog === "rejected" && !note.trim()) || submitting}>{dialog === "approved" ? "Konfirmasi persetujuan" : "Konfirmasi penolakan"}<Icon icon={Check} size={16} /></button></div></form></Modal>}
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
