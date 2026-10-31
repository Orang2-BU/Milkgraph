"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, ArrowUpRight, Braces, Check, CircleHelp, FlaskConical, PackageX, Search, Send, ShieldCheck, Truck } from "lucide-react";
import { scenario } from "@/lib/data";
import { number } from "@/lib/format";
import { Badge, Card, Icon, Modal, SectionTitle, SourceButton, SourceModal, Toggle } from "@/components/ui";
import { EvidenceGraph } from "./evidence-graph";
import { HandoffChain, lotAction } from "./genealogy";
import { submitHold, useDemo, type Hold } from "@/lib/demo";
import { can, whoCan } from "@/lib/roles";
import { API_MODE, apiGet, apiSend } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import type { Answer, Scenario } from "@/mock/types";

type TraceAnswer = Answer & { subjectRt?: string };

export function Trace() {
  const [selected, setSelected] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<TraceAnswer | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState("answer");
  const [holdDialog, setHoldDialog] = useState(false);
  const [holdNote, setHoldNote] = useState("");
  const [submittingHold, setSubmittingHold] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const demo = useDemo();

  const qcRes = useResource<Scenario["qcEvent"]>(API_MODE ? "/quality/active-event" : null);
  const templatesRes = useResource<{ id: string; question: string }[]>(API_MODE ? "/assistant/templates" : null);
  const forwardRes = useResource<TraceAnswer>(API_MODE ? "/trace/forward?rtId=RT-04&date=2026-10-13" : null);
  const summaryRes = useResource<{ baseline: { lots: number; packs: number } }>(API_MODE ? "/holds/summary" : null);
  const holdsRes = useResource<Hold[]>(API_MODE ? "/holds" : null);
  const handoffsRes = useResource<typeof scenario.handoffs>(API_MODE ? "/trace/handoffs?lotId=FG-1013-07" : null);

  const forwardAnswer = API_MODE ? forwardRes.data : scenario.answers.find(a => a.id === "forward");
  const forwardLots = forwardAnswer?.lots ?? [];
  const forwardPacks = forwardLots.reduce((sum, lot) => sum + lot.packs, 0);

  const lotIds = forwardLots.map(l => l.id);
  const locPath = API_MODE && lotIds.length > 0 ? `/lots/locations?ids=${lotIds.join(",")}` : null;
  const locRes = useResource<Record<string, { place: string; shipped: boolean }>>(locPath);

  const getLotLoc = (id: string) => {
    if (API_MODE) {
      return locRes.data?.[id] ?? { place: "Lokasi belum tercatat di ERP", shipped: false };
    }
    return lotAction(id);
  };

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (API_MODE && (!qcRes.data || !templatesRes.data || !forwardRes.data || !summaryRes.data || !holdsRes.data)) {
    if (qcRes.error || templatesRes.error || forwardRes.error || summaryRes.error || holdsRes.error) {
      const err = qcRes.error ?? templatesRes.error ?? forwardRes.error ?? summaryRes.error ?? holdsRes.error;
      return (
        <div className="page-enter" role="status">
          <p className="crit-text">Gagal memuat Traceability: {err?.message}</p>
        </div>
      );
    }
    return <div className="page-enter" role="status"><p className="muted">Memuat Traceability…</p></div>;
  }

  const qcEvent = API_MODE ? qcRes.data! : scenario.qcEvent;
  const templates = API_MODE ? templatesRes.data! : scenario.answers;
  const baseline = API_MODE ? summaryRes.data!.baseline : scenario.holdBaseline;
  const holdsList = API_MODE ? (holdsRes.data ?? demo.holds) : demo.holds;
  const holdSent = holdsList.find(h => h.trigger === qcEvent.lot && h.status !== "ditolak");
  const mayHold = can(demo.role, "hold.submit");
  const answer: TraceAnswer | null = API_MODE ? currentAnswer : (scenario.answers.find(a => a.id === selected) ?? null);

  async function ask(text: string, id?: string) {
    if (!text.trim()) return;
    if (timer.current) clearTimeout(timer.current);
    setQuestion(text);
    setLoading(true);
    setMobileTab("answer");

    if (API_MODE) {
      try {
        let ans: TraceAnswer | { id: "unknown"; question: string };
        if (id === "backward") {
          ans = await apiGet<TraceAnswer>(`/trace/backward?lotId=${qcEvent.lot || "FG-1013-07"}`, demo.role);
        } else if (id === "forward") {
          const rt = answer?.subjectRt || "RT-04";
          ans = await apiGet<TraceAnswer>(`/trace/forward?rtId=${rt}&date=2026-10-13`, demo.role);
        } else if (id === "bay2") {
          ans = await apiGet<TraceAnswer>("/trace/explain?resource=Bay%202&time=14.50", demo.role);
        } else {
          ans = await apiSend<TraceAnswer | { id: "unknown"; question: string }>("POST", "/assistant/ask", { question: text }, demo.role);
        }
        if (ans.id === "unknown") {
          setSelected("unknown");
          setCurrentAnswer(null);
        } else {
          setSelected(ans.id);
          setCurrentAnswer(ans as TraceAnswer);
        }
      } catch {
        setSelected("unknown");
        setCurrentAnswer(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    const q = text.toLowerCase();
    const match = id ?? (q.includes("bay 2") ? "bay2" : q.includes("rt-04") || q.includes("lot apa") ? "forward" : q.includes("fg-1013") || q.includes("berasal") ? "backward" : "unknown");
    timer.current = setTimeout(() => { setSelected(match); setLoading(false); }, 600);
  }

  async function handleHoldSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingHold(true);
    setHoldError(null);
    try {
      await submitHold({
        trigger: qcEvent.lot,
        rt: answer?.subjectRt || "RT-04",
        lots: forwardLots,
        note: holdNote.trim(),
      });
      setHoldDialog(false);
    } catch (err) {
      setHoldError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingHold(false);
    }
  }

  const activeLots = answer?.lots ?? forwardLots;
  const activePacks = activeLots.reduce((sum, lot) => sum + lot.packs, 0);

  return <div className="page-enter"><div className="page-heading"><div><h1>Traceability</h1><p>Telusuri genealogi lot berdasarkan proporsi volume.</p></div><button className="button primary" disabled={!!holdSent || !mayHold} title={mayHold ? undefined : whoCan("hold.submit")} onClick={() => { setHoldNote(""); setHoldError(null); setHoldDialog(true); }}><Icon icon={PackageX} />Ajukan daftar hold</button></div>
    <section className="qc-trigger" aria-label="Pemicu trace"><span className="qc-trigger-icon"><Icon icon={FlaskConical} size={20} /></span><div><Badge tone="crit">QC FG out-of-spec</Badge><p><strong className="mono">{qcEvent.lot}</strong> · {qcEvent.product} · {qcEvent.test}: {qcEvent.result}</p><span className="small muted">{qcEvent.time} · <button className="inline-link" onClick={() => setSource(qcEvent.source)}>Lihat hasil lab</button></span></div><div className="qc-trigger-actions"><button className="button secondary" onClick={() => ask(templates[0]?.question ?? `asal lot ${qcEvent.lot}`, "backward")}><Icon icon={ArrowUpFromLine} size={16} />Trace mundur</button><button className="button secondary" onClick={() => ask(forwardAnswer?.question ?? "lot apa saja yang mengandung susu RT-04", "forward")}><Icon icon={ArrowDownToLine} size={16} />Trace maju</button></div></section>
    {holdSent && <div className="decision-banner warn" role="status"><Icon icon={PackageX} /><span><strong>{holdSent.id} diajukan ke QA/Lab oleh {holdSent.by}, {holdSent.at}</strong><span>{forwardLots.length} lot, {number(forwardPacks)} pak. {holdSent.note} {holdSent.status === "diajukan" ? "Menunggu persetujuan QA; sistem tidak menahan produk otomatis." : holdSent.status === "aktif" ? `Hold aktif, disetujui ${holdSent.review?.by}.` : `Hold dilepas oleh ${holdSent.review?.by}.`} <Link className="inline-link" href="/hold">Buka daftar hold</Link></span></span></div>}
    <div className="mobile-trace-tabs"><Toggle label="Panel penelusuran" value={mobileTab} onChange={setMobileTab} options={[{ value: "answer", label: "Jawaban" }, { value: "graph", label: "Graph" }]} /></div>
    <div className={`trace-grid tab-${mobileTab}`}><div className="trace-answer-panel"><Card className="ask-card"><SectionTitle title="Tanya graph" subtitle="Asisten memilih query template terverifikasi, bukan menulis query bebas." /><form onSubmit={e => { e.preventDefault(); ask(question); }}><label htmlFor="question" className="sr-only">Pertanyaan tentang genealogi atau rencana</label><div className="question-field"><Icon icon={Search} /><input id="question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Tanyakan asal lot, RT, atau aset..." autoComplete="off" /><button aria-label="Kirim pertanyaan" className="send-button" disabled={!question.trim() || loading}><Icon icon={Send} size={18} /></button></div></form><div className="question-examples">{templates.map(a => <button key={a.id} onClick={() => ask(a.question, a.id)} aria-pressed={selected === a.id} className={selected === a.id ? "chosen" : ""}>{a.question}<Icon icon={ArrowUpRight} size={14} /></button>)}</div></Card>
      <div aria-live="polite" aria-busy={loading}>{loading ? <Card className="answer-skeleton"><span className="sr-only">Menjalankan query graph...</span><div /><div /><div /><div /></Card> : answer ? <Card className="answer-card"><div className="answer-status"><Icon icon={ShieldCheck} size={17} />Jalur graph terverifikasi<Badge>{answer.factors.length} sumber</Badge></div><p className="query-chip"><Icon icon={Braces} size={14} /><span className="mono">{answer.template}({answer.params})</span></p><h2>{answer.title}</h2><p className="answer-conclusion">{answer.conclusion}</p>{answer.id !== "bay2" && <Toggle label="Arah trace" value={answer.id} onChange={id => ask(templates.find(t => t.id === id)?.question ?? (id === "backward" ? `asal lot ${qcEvent.lot}` : "lot apa saja yang mengandung susu RT-04"), id)} options={[{ value: "backward", label: "Mundur: lot ke RT dan farm" }, { value: "forward", label: "Maju: RT ke lot" }]} />}{answer.mix && <div className="mix-chart"><p className="small muted">Proporsi volume di {qcEvent.lot}</p><div className="mix-bar">{answer.mix.map(m => <span key={m.id} style={{ width: `${m.percent}%` }} className={m.id === "RT-04" ? "suspect" : ""}>{m.percent}%</span>)}</div><div className="mix-legend">{answer.mix.map(m => <button key={m.id} className="source-chip compact" onClick={() => setSource("TR-RMT2")} onMouseEnter={() => setHighlighted(m.id.toLowerCase())} onMouseLeave={() => setHighlighted(null)} onFocus={() => setHighlighted(m.id.toLowerCase())} onBlur={() => setHighlighted(null)} aria-label={`Lihat transfer ${m.id}, ${m.percent}%`}><Icon icon={Truck} size={13} /><span>{m.id}</span></button>)}</div></div>}{answer.lots && <div className="lot-results"><table><thead><tr><th>Lot</th><th className="numeric">Isi RT-04</th><th className="numeric">Pak</th></tr></thead><tbody>{answer.lots.map(lot => <tr key={lot.id}><td><strong className="mono">{lot.id}</strong><span className="table-sub">{lot.product}</span></td><td data-label="Isi RT-04" className="numeric">{lot.percent}%</td><td data-label="Pak" className="numeric">{number(lot.packs)}</td></tr>)}</tbody></table><p className="hold-compare"><Icon icon={Check} size={15} /><span>Hold <strong>{activeLots.length} lot · {number(activePacks)} pak</strong>, dibanding {baseline.lots} lot · {number(baseline.packs)} pak tanpa genealogi volume [simulasi].</span></p></div>}{answer.id !== "bay2" && <><h3 className="factors-title">Rantai serah-terima batch</h3><p className="small muted">Dari surat jalan sampai lot. Serah-terima di transfer tank ST-4 dan mixing MX-2 sebelumnya hanya ada di catatan operator.</p><HandoffChain onSource={setSource} handoffs={API_MODE ? (handoffsRes.data ?? undefined) : undefined} /></>}<h3 className="factors-title">Jalur bukti</h3><ol className="factor-list">{answer.factors.map((factor, i) => <li key={factor.title}><span className="factor-number">{i + 1}</span><div><h4>{factor.title}</h4><p>{factor.text}</p><SourceButton id={factor.source} onSelect={setSource} onHighlight={setHighlighted} /></div></li>)}</ol><div className="evidence-note"><Icon icon={CircleHelp} size={16} /><p>{answer.note}</p></div>{answer.id === "backward" && <button className="follow-up" onClick={() => ask(forwardAnswer?.question ?? "lot apa saja yang mengandung susu RT-04", "forward")}>Lanjut trace maju dari RT-04<Icon icon={ArrowRight} size={16} /></button>}</Card> : <Card className="empty-answer"><span className="placeholder-symbol"><Icon icon={selected === "unknown" ? CircleHelp : Search} size={28} /></span><h2>{selected === "unknown" ? "Tidak ada query template yang cocok" : "Mulai dari hasil QC atau pertanyaan"}</h2><p>{selected === "unknown" ? "Asisten tidak menebak jawaban. Coba salah satu contoh pertanyaan, atau minta tim menambahkan template query." : "Jalankan trace mundur dari lot bermasalah, atau trace maju dari RT untuk menyusun daftar hold."}</p></Card>}</div></div>
    <Card className="trace-graph-panel"><SectionTitle title="Graph view" subtitle="Jalur genealogi dari farm sampai lot barang jadi." action={<Badge>{answer ? "Jalur aktif" : "Context graph"}</Badge>} /><EvidenceGraph answer={answer} highlighted={highlighted} onSource={setSource} /><div className="graph-footnote"><Icon icon={ShieldCheck} size={17} /><p><strong>Jawaban bisa diaudit.</strong> Setiap angka berasal dari transfer FILLED_INTO dengan volume dan jendela waktu.</p></div></Card></div>
    {holdDialog && <Modal title="Ajukan hold dan recall ke QA?" onClose={() => { setHoldDialog(false); setHoldError(null); }}><form onSubmit={handleHoldSubmit}><Badge>Data simulasi</Badge><p className="dialog-summary">{forwardLots.length} lot mengandung susu RT-04, total {number(forwardPacks)} pak. QA/Lab yang memutuskan hold atau recall.</p>{holdError && <p className="crit-text small">{holdError}</p>}<ul className="hold-list">{forwardLots.map(lot => { const at = getLotLoc(lot.id); return <li key={lot.id}><span className="mono">{lot.id}</span><span>{lot.percent}% RT-04 · {number(lot.packs)} pak</span><span className={at.shipped ? "crit-text" : ""}>{at.shipped ? "Recall" : "Hold"}: {at.place}</span></li>; })}</ul><p className="small muted">{forwardLots.filter(l => getLotLoc(l.id).shipped).length} lot sudah dikirim dan perlu recall; sisanya ditahan di gudang.</p><label className="field-label" htmlFor="hold-note">Catatan (opsional)</label><textarea id="hold-note" value={holdNote} onChange={e => setHoldNote(e.target.value)} placeholder="Contoh: prioritaskan uji ulang sampel retensi RT-04." maxLength={500} /><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => { setHoldDialog(false); setHoldError(null); }} disabled={submittingHold}>Batal</button><button className="button primary" disabled={submittingHold}>{submittingHold ? "Memproses…" : "Ajukan ke QA"}<Icon icon={Check} size={16} /></button></div></form></Modal>}
    <SourceModal id={source} onClose={() => setSource(null)} /></div>;
}
