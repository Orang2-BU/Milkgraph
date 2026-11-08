"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MessageSquareText, SendHorizontal, Sparkles } from "lucide-react";
import { Icon } from "@/components/ui";
import { ASSETS, STAGES } from "@/lib/assets";
import { badgeOf, type Adjust } from "./adjust";
import type { Proposal, Reply } from "./plan-answer";

type Msg = { role: "user" | "assistant"; content: string; proposals?: Proposal[] };
const DURATIONS = [15, 30, 45, 60, 90];

/**
 * Panel "Tanya rencana" (poin 16-17, referensi layout PDF): planner bertanya lewat chat, jawaban dihitung dari jadwal
 * rencana (penjawab statis plan-answer.ts, tanpa LLM), dan usulannya bisa langsung diterapkan ke alur di sampingnya.
 */
export function PlanChat({ onAsk, onApply }: {
  onAsk: (question: string, defaults: { alat: string; durasi: number }) => Reply;
  onApply: (id: string, adjust: Adjust) => void;
}) {
  const [alat, setAlat] = useState("Bay 1");
  const [durasi, setDurasi] = useState(30);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => { list.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [msgs]);

  function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    const r = onAsk(q, { alat, durasi });
    setMsgs(m => [...m, { role: "user", content: q }, { role: "assistant", content: r.reply, proposals: r.proposals }]);
    setDraft("");
  }

  const quick = [
    { label: "Waktu maintenance terbaik", text: `Kapan waktu maintenance terbaik untuk ${alat} selama ${durasi} menit?` },
    { label: "Lihat jalur terdampak", text: `Alat apa saja yang terdampak kalau ${alat} berhenti?` },
    { label: "Kapasitas yang dibutuhkan", text: `Berapa kapasitas ${alat} yang dibutuhkan, dan apa efeknya ke rencana?` },
    { label: "Kenapa rencana ini melanggar?", text: "Constraint apa yang dilanggar di versi ini, dan kapan kejadiannya?" },
  ];

  return <section className="card plan-chat" aria-labelledby="plan-chat-title">
    <header className="plan-chat-head">
      <span className="plan-chat-icon"><Icon icon={MessageSquareText} size={20} /></span>
      <div><h2 id="plan-chat-title">Tanya rencana</h2><p>Jawaban dihitung langsung dari jadwal rencana yang sedang dilihat.</p></div>
    </header>

    <div className="plan-chat-pick">
      <label><span>Alat</span><select value={alat} onChange={e => setAlat(e.target.value)}>
        {STAGES.map(st => <optgroup key={st} label={st}>{ASSETS.filter(a => a.stage === st).map(a => <option key={a.id}>{a.id}</option>)}</optgroup>)}
      </select></label>
      <label><span>Durasi</span><select value={durasi} onChange={e => setDurasi(Number(e.target.value))}>{DURATIONS.map(d => <option key={d} value={d}>{d} menit</option>)}</select></label>
    </div>

    <ol className="plan-chat-log" ref={list} aria-live="polite">
      {!msgs.length && <li className="plan-chat-empty">
        <Icon icon={Sparkles} size={22} />
        <strong>Mulai dari kebutuhanmu</strong>
        <p>Pilih alat, lalu tanyakan waktu maintenance atau perubahan kapasitas. Usulannya bisa langsung diterapkan ke alur di samping.</p>
      </li>}
      {msgs.map((m, i) => <li key={i} className={`plan-msg ${m.role}`}>
        <p>{m.content}</p>
        {m.proposals?.map(p => {
          const key = `${i}-${p.id}`, done = applied.has(key);
          return <div key={key} className="plan-proposal">
            <div><strong className="mono">{p.id}</strong> {badgeOf(p.adjust)}{p.reason && <small>{p.reason}</small>}</div>
            <button type="button" className={`button ${done ? "secondary" : "primary"}`} disabled={done} onClick={() => { onApply(p.id, p.adjust); setApplied(s => new Set(s).add(key)); }}>
              {done ? <><Icon icon={Check} size={15} />Diterapkan</> : "Terapkan di alur"}
            </button>
          </div>;
        })}
      </li>)}
    </ol>

    <div className="plan-chat-quick">{quick.map(q => <button key={q.label} type="button" onClick={() => ask(q.text)}>{q.label}</button>)}</div>

    <form className="plan-chat-input" onSubmit={e => { e.preventDefault(); ask(draft); }}>
      <label htmlFor="plan-chat-q" className="sr-only">Pertanyaan untuk rencana</label>
      <textarea id="plan-chat-q" rows={2} value={draft} maxLength={1000} placeholder="Misal: maintenance F2 terbaik kapan untuk 45 menit?"
        onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(draft); } }} />
      <button type="submit" className="plan-chat-send" disabled={!draft.trim()} aria-label="Kirim pertanyaan"><Icon icon={SendHorizontal} size={18} /></button>
    </form>
    <p className="small muted">Analisis dari jadwal yang tersedia [simulasi]. Keputusan tetap di planner.</p>
  </section>;
}
