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
import { submitHold, useDemo } from "@/lib/demo";
import { can, whoCan } from "@/lib/roles";

const forward = scenario.answers.find(a => a.id === "forward")!;
const lots = forward.lots!;
const packs = lots.reduce((sum, lot) => sum + lot.packs, 0);
/** Node yang langsung dibuka di panel detail untuk tiap jawaban. */
const FOCUS: Record<string, string> = { backward: "fg-07", forward: "rt-04", bay2: "rt-26" };
type View = "graph" | "table" | "mass";

export function Trace() {
  // Halaman langsung membuka trace mundur dari lot QC bermasalah, jadi pengguna tidak mulai dari layar kosong.
  const [selected, setSelected] = useState<string | null>("backward");
  const [node, setNode] = useState<string | null>(FOCUS.backward);
  const [view, setView] = useState<View>("graph");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [holdDialog, setHoldDialog] = useState(false);
  const [holdNote, setHoldNote] = useState("");
  const demo = useDemo();
  const holdSent = demo.holds.find(h => h.trigger === scenario.qcEvent.lot && h.status !== "ditolak");
  const mayHold = can(demo.role, "hold.submit");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answer = scenario.answers.find(a => a.id === selected) ?? null;
  const genealogy = answer?.id === "backward" || answer?.id === "forward";
  const selectNode = useCallback((id: string) => setNode(id), []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function ask(text: string, id?: string) {
    if (!text.trim()) return;
    if (timer.current) clearTimeout(timer.current);
    setQuestion(text); setLoading(true);
    const q = text.toLowerCase();
    const match = id ?? (q.includes("bay 2") ? "bay2" : q.includes("rt-04") || q.includes("lot apa") ? "forward" : q.includes("fg-1013") || q.includes("berasal") ? "backward" : "unknown");
    timer.current = setTimeout(() => { setSelected(match); setNode(FOCUS[match] ?? null); if (match === "bay2" || match === "unknown") setView("graph"); setLoading(false); }, 600);
  }
  return <div className="page-enter">
    <div className="page-heading trace-heading"><div><h1>Traceability</h1><p>Asal dan sebaran volume susu per lot.</p></div>
      <form className="trace-ask" onSubmit={e => { e.preventDefault(); ask(question); }}><label htmlFor="question" className="sr-only">Pertanyaan tentang genealogi atau rencana</label><div className="question-field"><Icon icon={Search} /><input id="question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Tanya asal lot, RT, atau aset..." autoComplete="off" list="trace-examples" /><button aria-label="Kirim pertanyaan" className="send-button" disabled={!question.trim() || loading}><Icon icon={Send} size={18} /></button></div><datalist id="trace-examples">{scenario.answers.map(a => <option key={a.id} value={a.question} />)}</datalist></form>
      <button className="button primary" disabled={!!holdSent || !mayHold} title={mayHold ? undefined : whoCan("hold.submit")} onClick={() => { setHoldNote(""); setHoldDialog(true); }}><Icon icon={PackageX} />Ajukan daftar hold</button>
    </div>
    <section className="qc-trigger compact" aria-label="Pemicu trace"><span className="qc-trigger-icon"><Icon icon={FlaskConical} size={18} /></span><p><Badge tone="crit">QC out-of-spec</Badge> <strong className="mono">{scenario.qcEvent.lot}</strong> · {scenario.qcEvent.test}: {scenario.qcEvent.result}</p><SourceButton id={scenario.qcEvent.source} onSelect={setSource} compact /></section>
    {holdSent && <div className="decision-banner warn" role="status"><Icon icon={PackageX} /><span><strong>{holdSent.id} diajukan ke QA/Lab oleh {holdSent.by}, {holdSent.at}</strong><span>{lots.length} lot · {number(packs)} pak · {holdSent.status === "diajukan" ? "menunggu QA" : holdSent.status === "aktif" ? "hold aktif" : "hold dilepas"}. <Link className="inline-link" href="/hold">Buka daftar hold</Link></span></span></div>}
    <Card className="trace-card">
      <div className="trace-toolbar"><Toggle label="Arah trace" value={selected ?? ""} onChange={id => ask(scenario.answers.find(a => a.id === id)!.question, id)} options={[{ value: "backward", label: "Trace mundur" }, { value: "forward", label: "Trace maju" }]} />{genealogy && <Toggle label="Tampilan trace" value={view} onChange={setView} options={[{ value: "graph", label: "Graf" }, { value: "table", label: "Tabel" }, { value: "mass", label: "Mass Balance" }]} />}</div>
      <div aria-live="polite" aria-busy={loading} className="trace-summary">{loading ? <div className="answer-skeleton"><span className="sr-only">Menjalankan query graph...</span><div /><div /></div> : answer ? <>
        <h2>{answer.title}</h2><p className="answer-conclusion">{answer.conclusion}</p>
        <div className="trace-evidence"><span className="query-chip"><Icon icon={Braces} size={14} /><span className="mono">{answer.template}({answer.params})</span></span>{answer.factors.map(f => <SourceButton key={f.source + f.title} id={f.source} onSelect={setSource} onHighlight={setHighlighted} compact />)}</div>
        <p className="evidence-note"><Icon icon={CircleHelp} size={15} />{answer.note}</p>
      </> : <div className="empty-answer"><h2>Tidak ada query template yang cocok</h2><p>Asisten tidak menebak. Coba trace mundur atau trace maju.</p></div>}</div>
      {view === "graph" || !genealogy ? <><EvidenceGraph answer={answer} highlighted={highlighted} selected={node} onSelect={selectNode} /><NodeDetail id={node} onSource={setSource} /></>
        : view === "table" ? <TraceTable answer={answer!} onSource={setSource} onHighlight={setHighlighted} />
          : <MassBalance onSource={setSource} />}
    </Card>
    {holdDialog && <Modal title="Ajukan hold dan recall ke QA?" onClose={() => setHoldDialog(false)}><form onSubmit={e => { e.preventDefault(); submitHold({ trigger: scenario.qcEvent.lot, rt: "RT-04", lots, note: holdNote.trim() }); setHoldDialog(false); }}><Badge>Data simulasi</Badge><p className="dialog-summary">{lots.length} lot mengandung susu RT-04, total {number(packs)} pak. QA/Lab yang memutuskan hold atau recall.</p><ul className="hold-list">{lots.map(lot => { const at = lotAction(lot.id); return <li key={lot.id}><span className="mono">{lot.id}</span><span>{lot.percent}% RT-04 · {number(lot.packs)} pak</span><span className={at.shipped ? "crit-text" : ""}>{at.shipped ? "Recall" : "Hold"}: {at.place}</span></li>; })}</ul><p className="small muted">{lots.filter(l => lotAction(l.id).shipped).length} lot sudah dikirim dan perlu recall; sisanya ditahan di gudang.</p><label className="field-label" htmlFor="hold-note">Catatan (opsional)</label><textarea id="hold-note" value={holdNote} onChange={e => setHoldNote(e.target.value)} placeholder="Contoh: prioritaskan uji ulang sampel retensi RT-04." maxLength={500} /><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => setHoldDialog(false)}>Batal</button><button className="button primary">Ajukan ke QA<Icon icon={Check} size={16} /></button></div></form></Modal>}
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
