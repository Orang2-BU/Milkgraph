"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Braces, Check, CircleHelp, FlaskConical, PackageX, Search, Send } from "lucide-react";
import { scenario } from "@/lib/data";
import { number } from "@/lib/format";
import { Badge, Card, Icon, Modal, SourceButton, SourceModal, Toggle } from "@/components/ui";
import { EvidenceGraph } from "./evidence-graph";
import { lotAction } from "./genealogy";
import { MassBalance, NodeDetail, TraceTable } from "./trace-views";
import { submitHold, useDemo, type Hold } from "@/lib/demo";
import { can, whoCan } from "@/lib/roles";
import { API_MODE, apiGet, apiSend } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import type { Answer, Scenario } from "@/mock/types";

type TraceAnswer = Answer & { subjectRt?: string };

/** Node yang langsung dibuka di panel detail untuk tiap jawaban. */
const FOCUS: Record<string, string> = { backward: "fg-07", forward: "rt-04", bay2: "rt-26" };
type View = "graph" | "table" | "mass";

export function Trace() {
  const [selected, setSelected] = useState<string | null>("backward");
  const [node, setNode] = useState<string | null>(FOCUS.backward);
  const [view, setView] = useState<View>("graph");
  const [currentAnswer, setCurrentAnswer] = useState<TraceAnswer | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
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
  const _handoffsRes = useResource<typeof scenario.handoffs>(API_MODE ? "/trace/handoffs?lotId=FG-1013-07" : null);
  void _handoffsRes;

  const forwardAnswer = API_MODE ? forwardRes.data : scenario.answers.find(a => a.id === "forward");
  const forwardLots = forwardAnswer?.lots ?? [];
  const forwardPacks = forwardLots.reduce((sum, lot) => sum + lot.packs, 0);
  const lots = forwardLots;
  const packs = forwardPacks;

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
  const selectNode = useCallback((id: string) => setNode(id), []);
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
  const _baseline = API_MODE ? summaryRes.data!.baseline : scenario.holdBaseline;
  void _baseline;
  const holdsList = API_MODE ? (holdsRes.data ?? demo.holds) : demo.holds;
  const holdSent = holdsList.find(h => h.trigger === qcEvent.lot && h.status !== "ditolak");
  const mayHold = can(demo.role, "hold.submit");
  const answer: TraceAnswer | null = API_MODE ? currentAnswer : (scenario.answers.find(a => a.id === selected) ?? null);
  const genealogy = answer?.id === "backward" || answer?.id === "forward";

  async function ask(text: string, id?: string) {
    if (!text.trim()) return;
    if (timer.current) clearTimeout(timer.current);
    setQuestion(text);
    setLoading(true);

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
          setNode(FOCUS[ans.id] ?? null);
          if (ans.id === "bay2" || ans.id === "unknown") setView("graph");
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
    timer.current = setTimeout(() => { setSelected(match); setNode(FOCUS[match] ?? null); if (match === "bay2" || match === "unknown") setView("graph"); setLoading(false); }, 600);
  }
  async function handleHoldSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingHold(true);
    setHoldError(null);
    try {
      await submitHold({
        trigger: qcEvent.lot,
        rt: answer?.subjectRt || "RT-04",
        lots,
        note: holdNote.trim(),
      });
      setHoldDialog(false);
    } catch (err) {
      setHoldError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmittingHold(false);
    }
  }

  return <div className="page-enter">
    <div className="page-heading trace-heading"><div><h1>Traceability</h1><p>Asal dan sebaran volume susu per lot.</p></div>
      <form className="trace-ask" onSubmit={e => { e.preventDefault(); ask(question); }}><label htmlFor="question" className="sr-only">Pertanyaan tentang genealogi atau rencana</label><div className="question-field"><Icon icon={Search} /><input id="question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Tanya asal lot, RT, atau aset..." autoComplete="off" list="trace-examples" /><button aria-label="Kirim pertanyaan" className="send-button" disabled={!question.trim() || loading}><Icon icon={Send} size={18} /></button></div><datalist id="trace-examples">{templates.map(a => <option key={a.id} value={a.question} />)}</datalist></form>
      <button className="button primary" disabled={!!holdSent || !mayHold || submittingHold} title={mayHold ? undefined : whoCan("hold.submit")} onClick={() => { setHoldNote(""); setHoldError(null); setHoldDialog(true); }}><Icon icon={PackageX} />Ajukan daftar hold</button>
    </div>
    <section className="qc-trigger compact" aria-label="Pemicu trace"><span className="qc-trigger-icon"><Icon icon={FlaskConical} size={18} /></span><p><Badge tone="crit">QC out-of-spec</Badge> <strong className="mono">{qcEvent.lot}</strong> · {qcEvent.test}: {qcEvent.result}</p><SourceButton id={qcEvent.source} onSelect={setSource} compact /></section>
    {holdSent && <div className="decision-banner warn" role="status"><Icon icon={PackageX} /><span><strong>{holdSent.id} diajukan ke QA/Lab oleh {holdSent.by}, {holdSent.at}</strong><span>{lots.length} lot · {number(packs)} pak · {holdSent.status === "diajukan" ? "menunggu QA" : holdSent.status === "aktif" ? "hold aktif" : "hold dilepas"}. <Link className="inline-link" href="/hold">Buka daftar hold</Link></span></span></div>}
    <Card className="trace-card">
      <div className="trace-toolbar"><Toggle label="Arah trace" value={selected ?? ""} onChange={id => ask(templates.find(a => a.id === id)?.question ?? "", id)} options={[{ value: "backward", label: "Trace mundur" }, { value: "forward", label: "Trace maju" }]} />{genealogy && <Toggle label="Tampilan trace" value={view} onChange={setView} options={[{ value: "graph", label: "Graf" }, { value: "table", label: "Tabel" }, { value: "mass", label: "Mass Balance" }]} />}</div>
      <div aria-live="polite" aria-busy={loading} className="trace-summary">{loading ? <div className="answer-skeleton"><span className="sr-only">Menjalankan query graph...</span><div /><div /></div> : answer ? <>
        <h2>{answer.title}</h2><p className="answer-conclusion">{answer.conclusion}</p>
        <div className="trace-evidence"><span className="query-chip"><Icon icon={Braces} size={14} /><span className="mono">{answer.template}({answer.params})</span></span>{answer.factors.map(f => <SourceButton key={f.source + f.title} id={f.source} onSelect={setSource} onHighlight={setHighlighted} compact />)}</div>
        <p className="evidence-note"><Icon icon={CircleHelp} size={15} />{answer.note}</p>
      </> : <div className="empty-answer"><h2>Tidak ada query template yang cocok</h2><p>Asisten tidak menebak. Coba trace mundur atau trace maju.</p></div>}</div>
      {view === "graph" || !genealogy ? <><EvidenceGraph answer={answer} highlighted={highlighted} selected={node} onSelect={selectNode} onSource={setSource} /><NodeDetail id={node} onSource={setSource} /></>
        : view === "table" ? <TraceTable answer={answer!} onSource={setSource} onHighlight={setHighlighted} />
          : <MassBalance onSource={setSource} />}
    </Card>
    {holdDialog && <Modal title="Ajukan hold dan recall ke QA?" onClose={() => { setHoldDialog(false); setHoldError(null); }}><form onSubmit={handleHoldSubmit}><Badge>Data simulasi</Badge><p className="dialog-summary">{lots.length} lot mengandung susu {answer?.subjectRt || "RT-04"}, total {number(packs)} pak. QA/Lab yang memutuskan hold atau recall.</p>{holdError && <p className="crit-text small">{holdError}</p>}<ul className="hold-list">{lots.map(lot => { const at = getLotLoc(lot.id); return <li key={lot.id}><span className="mono">{lot.id}</span><span>{lot.percent}% {answer?.subjectRt || "RT-04"} · {number(lot.packs)} pak</span><span className={at.shipped ? "crit-text" : ""}>{at.shipped ? "Recall" : "Hold"}: {at.place}</span></li>; })}</ul><p className="small muted">{lots.filter(l => getLotLoc(l.id).shipped).length} lot sudah dikirim dan perlu recall; sisanya ditahan di gudang.</p><label className="field-label" htmlFor="hold-note">Catatan (opsional)</label><textarea id="hold-note" value={holdNote} onChange={e => setHoldNote(e.target.value)} placeholder="Contoh: prioritaskan uji ulang sampel retensi RT-04." maxLength={500} /><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => { setHoldDialog(false); setHoldError(null); }} disabled={submittingHold}>Batal</button><button className="button primary" disabled={submittingHold}>{submittingHold ? "Memproses…" : "Ajukan ke QA"}<Icon icon={Check} size={16} /></button></div></form></Modal>}
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
