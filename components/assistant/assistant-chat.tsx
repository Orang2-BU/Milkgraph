"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUp, ArrowUpRight, Bot, ChevronLeft, X } from "lucide-react";
import { Icon } from "@/components/ui";
import { ASSETS, LINKS } from "@/lib/assets";
import { scenario } from "@/lib/data";
import { useDemo } from "@/lib/demo";
import { ROLES } from "@/lib/roles";
import { asepticTanks, fillers } from "@/mock/ops";
import type { Plan } from "@/mock/types";
import { badgeOf } from "@/components/rencana/adjust";
import { rankUpgrades } from "@/components/rencana/recommend";
import { useRencana } from "@/components/rencana/rencana-state";
import { withAdjust } from "@/components/rencana/with-adjust";
import { reply, suggestions, thinkingSteps, type Link as AnswerLink } from "./answer";
import ThoughtLine from "./bits/ThoughtLine";
import VoicePill from "./bits/VoicePill";
import { normalizeSpeech } from "./speech";

// WebGL dimuat hanya di browser dan hanya saat dibutuhkan.
const Orb = dynamic(() => import("./bits/Orb"), { ssr: false });
const ORB_COLORS = ["#008a30", "#35c46c", "#07481f"];

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognizer = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; abort(): void; onresult: ((e: { results: ArrayLike<SpeechResult> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
type RecognizerClass = new () => Recognizer;
const recognizerClass = () => {
  const w = window as unknown as { SpeechRecognition?: RecognizerClass; webkitSpeechRecognition?: RecognizerClass };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const noSubscribe = () => () => {};
/** Jarak geser ke kanan (px) yang menyembunyikan tombol. */
const HIDE_DISTANCE = 40;

type Msg = { id: number; role: "user" | "bot"; text: string; links?: AnswerLink[]; steps?: string[]; working?: boolean };
/** Jeda antar-langkah animasi berpikir (ms). */
const STEP_MS = 480;

/** Logo AI: Orb bergerak; ikon di bawahnya jadi cadangan saat WebGL gagal atau gerak dikurangi. */
function AiOrb({ size }: { size?: number }) {
  const still = useSyncExternalStore(noSubscribe, reducedMotion, () => true);
  return <span className="ai-orb" style={size ? { width: size, height: size } : undefined} aria-hidden="true">
    <Bot size={size ? Math.round(size * 0.5) : 24} />
    {!still && <Orb colors={ORB_COLORS} backgroundColor="#0b2a18" glow={0.55} highlight={0.5} followCursor={false} clickPulse={false} />}
  </span>;
}

/** Teks bot muncul per kata; pembaca layar menerima kalimat utuh lewat wilayah live. */
function Typed({ text, onDone }: { text: string; onDone: () => void }) {
  const words = text.split(" ");
  const [n, setN] = useState(() => reducedMotion() ? words.length : 0);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  useEffect(() => {
    if (reducedMotion()) { done.current(); return; }
    let i = 0;
    const t = setInterval(() => { i++; setN(i); if (i >= words.length) { clearInterval(t); done.current(); } }, 32);
    return () => clearInterval(t);
  }, [words.length]);
  return <p aria-hidden="true">{words.slice(0, n).join(" ")}</p>;
}

/**
 * Tanya MilkGraph: chatbot melayang di kanan bawah (masukan dosen). Tanpa LLM; jawaban dirakit dari data dan kondisi aplikasi saat ditanya.
 * Pola panel mengikuti Ask Bar 21st.dev yang ditulis ulang ke CSS proyek; Orb dan ThoughtLine dari React Bits.
 */
export function AssistantChat() {
  const page = usePathname();
  const demo = useDemo();
  const { adj, planId } = useRencana();
  const [open, setOpen] = useState(false);
  // Disembunyikan: tombol bulat hilang, tersisa tab kecil di tepi kanan layar untuk memunculkannya lagi.
  const [hidden, setHidden] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [typing, setTyping] = useState<number | null>(null);
  // Suara ke teks: tombol hanya tampil di browser yang mendukung (Chrome, Edge, Safari).
  const canDictate = useSyncExternalStore(noSubscribe, () => !!recognizerClass(), () => false);
  const finePointer = useSyncExternalStore(noSubscribe, () => window.matchMedia("(pointer: fine)").matches, () => true);
  const [listening, setListening] = useState(false);
  // Kapsul menyusut halus dulu sebelum kolom kembali normal.
  const [closing, setClosing] = useState(false);
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const [pillKey, setPillKey] = useState(0);
  const voice = useRef<{ rec: Recognizer; before: string; heard: string; session: string; active: boolean } | null>(null);
  const [live, setLive] = useState("");
  const last = useRef<string | undefined>(undefined);
  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const fab = useRef<HTMLButtonElement>(null);
  const tab = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const me = ROLES[demo.role];

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (closingTimer.current) clearTimeout(closingTimer.current); }, []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  // Tinggi kolom mengikuti isi, baik diketik maupun dari suara.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, open]);
  useEffect(() => () => { const v = voice.current; if (v) { v.active = false; v.rec.abort(); } }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [msgs, thinking, typing]);

  function startVoice() {
    const Rec = recognizerClass();
    if (!Rec) return;
    setVoiceError("");
    const rec = new Rec();
    Object.assign(rec, { lang: "id-ID", continuous: true, interimResults: true });
    const state = { rec, before: draft.trim(), heard: "", session: "", active: true };
    voice.current = state;
    rec.onresult = e => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      state.session = text;
      setDraft([state.before, state.heard, normalizeSpeech(text)].filter(Boolean).join(" ").trim());
    };
    rec.onerror = e => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      state.active = false;
      setVoiceError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Izin mikrofon ditolak. Aktifkan lewat ikon gembok di alamat browser." : e.error === "network" ? "Pengenal suara butuh koneksi internet." : "Suara belum bisa dikenali. Coba lagi.");
      setPillKey(k => k + 1); // memasang ulang tombol supaya berhenti merekam
    };
    // Chrome menghentikan rekaman saat hening; lanjutkan selama tombol masih aktif.
    rec.onend = () => {
      if (!state.active) return;
      state.heard = [state.heard, normalizeSpeech(state.session)].filter(Boolean).join(" ");
      state.session = "";
      rec.start();
    };
    rec.start();
    setListening(true);
  }

  function stopVoice(reason: string) {
    const v = voice.current;
    setListening(false);
    if (reason !== "unmount" && !reducedMotion()) {
      setClosing(true);
      if (closingTimer.current) clearTimeout(closingTimer.current);
      closingTimer.current = setTimeout(() => setClosing(false), 320);
    }
    if (!v) return;
    voice.current = null;
    v.active = false;
    if (reason === "cancel" || reason === "unmount") { v.rec.abort(); if (reason === "cancel") setDraft(v.before); }
    else v.rec.stop();
    if (reason === "mic-denied") setVoiceError("Izin mikrofon ditolak. Aktifkan lewat ikon gembok di alamat browser.");
    input.current?.focus();
  }

  function close() { setOpen(false); requestAnimationFrame(() => fab.current?.focus()); }
  function hide() { setOpen(false); setHidden(true); requestAnimationFrame(() => tab.current?.focus()); }
  function show() { setHidden(false); requestAnimationFrame(() => fab.current?.focus()); }

  /** Dihitung saat ditanya, jadi jawaban selalu memakai kondisi terbaru. */
  function answer(q: string) {
    const plan = scenario.plans.find(p => p.id === planId) ?? scenario.plans[0];
    const broken = {
      before: withAdjust(plan as unknown as Plan, "before", adj, demo.limits).broken,
      after: withAdjust(plan as unknown as Plan, "after", adj, demo.limits).broken,
    };
    return reply(q, { assets: ASSETS, links: LINKS, tankers: scenario.tankers, answers: scenario.answers, plans: scenario.plans, upgrades: rankUpgrades(asepticTanks, fillers, adj).picks }, {
      page, user: me.user, roleLabel: me.label, roleFocus: me.focus, planId, decisions: demo.decisions, holds: demo.holds, labs: demo.labs,
      adjustText: Object.keys(adj).map(id => `${id} ${badgeOf(adj[id])}`).join(", "), broken, lastAsset: last.current,
    });
  }

  function ask(text: string) {
    const q = text.trim();
    if (!q || thinking || typing !== null || listening) return;
    setDraft("");
    // Tinggi kolom dikembalikan ke satu baris; fokus tetap di kolom walau bertanya lewat tombol saran.
    if (input.current) { input.current.style.height = ""; input.current.focus(); }
    setMsgs(m => [...m, { id: nextId.current++, role: "user", text: q }]);
    setThinking(true);
    const id = nextId.current++, all = thinkingSteps(q);
    const patch = (change: Partial<Msg>) => setMsgs(m => m.map(x => x.id === id ? { ...x, ...change } : x));
    setMsgs(m => [...m, { id, role: "bot", text: "", steps: reducedMotion() ? all : all.slice(0, 1), working: true }]);
    // Langkah muncul satu per satu, lalu jawaban dihitung dari kondisi saat itu.
    const advance = (n: number) => {
      timer.current = setTimeout(() => {
        if (n < all.length) { patch({ steps: all.slice(0, n + 1) }); advance(n + 1); return; }
        const r = answer(q);
        if (r.lastAsset) last.current = r.lastAsset;
        patch({ text: r.text, links: r.links, working: false });
        setThinking(false);
        setTyping(id);
        setLive(r.text);
      }, reducedMotion() ? 0 : STEP_MS);
    };
    advance(1);
  }

  if (hidden) return <button ref={tab} type="button" className="ai-tab" aria-label="Munculkan Tanya MilkGraph" title="Munculkan Tanya MilkGraph" onClick={show}><ChevronLeft size={14} aria-hidden="true" /><Bot size={18} aria-hidden="true" /></button>;
  if (!open) return <div className="ai-dock">
    <button ref={fab} type="button" className="ai-fab" aria-label="Buka Tanya MilkGraph, asisten. Tekan panah kanan untuk menyembunyikan" title="Klik untuk bertanya, geser ke kanan untuk menyembunyikan"
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, moved: false }; }}
      onPointerMove={e => {
        if (!drag.current) return;
        const dx = Math.max(0, e.clientX - drag.current.x);
        if (dx > 4) drag.current.moved = true;
        e.currentTarget.style.transform = `translateX(${dx}px)`;
        e.currentTarget.style.opacity = String(Math.max(0.35, 1 - dx / HIDE_DISTANCE / 2));
      }}
      onPointerUp={e => {
        const dx = drag.current ? e.clientX - drag.current.x : 0;
        e.currentTarget.style.transform = e.currentTarget.style.opacity = "";
        if (dx >= HIDE_DISTANCE) { drag.current = null; hide(); return; }
        if (drag.current && !drag.current.moved) setOpen(true);
        drag.current = null;
      }}
      onPointerCancel={e => { drag.current = null; e.currentTarget.style.transform = e.currentTarget.style.opacity = ""; }}
      onClick={e => { if (e.detail === 0) setOpen(true); }}
      onKeyDown={e => { if (e.key === "ArrowRight") { e.preventDefault(); hide(); } }}><AiOrb /></button>
  </div>;

  const empty = msgs.length === 0;
  return <section className="ai-panel" role="dialog" aria-label="Tanya MilkGraph" onKeyDown={e => { if (e.key === "Escape") close(); }}>
    <header className="ai-head">
      {!empty && <AiOrb size={36} />}
      <div><h2>Tanya MilkGraph</h2><p><i aria-hidden="true" />Membaca kondisi 14.42</p></div>
      <span className="ai-head-actions">
        <button type="button" className="icon-button" aria-label="Tutup asisten" title="Tutup" onClick={close}><Icon icon={X} size={18} /></button>
      </span>
    </header>

    {empty ? <div className="ai-hello">
      <AiOrb size={84} />
      <h3>Mau cek apa, {me.user.split(" ")[0]}?</h3>
      <p>Tanya soal jalur susu, kendala alat, asal lot, atau rencana shift.</p>
    </div> : <div className="ai-log" ref={log}>
      {msgs.map(m => m.role === "user"
        ? <div key={m.id} className="ai-msg user"><p>{m.text}</p></div>
        : <div key={m.id} className="ai-msg">
          <span className="ai-avatar" aria-hidden="true"><Bot size={16} /></span>
          <div className="ai-body">
            <ThoughtLine working={!!m.working} steps={m.steps} label="Menganalisis data pabrik…" doneLabel="Dianalisis dalam" glyph="none" fontSize={13} color="var(--color-on-surface-muted)" />
            {!m.working && (typing === m.id ? <Typed text={m.text} onDone={() => setTyping(null)} /> : <p>{m.text}</p>)}
            {!m.working && typing !== m.id && !!m.links?.length && <div className="ai-links">{m.links.map(l => <Link key={l.href} href={l.href}>{l.label}<ArrowUpRight size={13} aria-hidden="true" /></Link>)}</div>}
          </div>
        </div>)}
    </div>}
    <p className="sr-only" aria-live="polite">{live}</p>

    {!listening && (empty || (!thinking && typing === null)) && <div className={`ai-suggest${empty ? "" : " row"}`}>{suggestions(page).map(q => <button key={q} type="button" onClick={() => ask(q)}>{q}</button>)}</div>}

    {listening && <p className="ai-heard" aria-live="polite">{draft || "Silakan bicara..."}</p>}
    <form className="ai-form" onSubmit={e => { e.preventDefault(); ask(draft); }}>
      <div className={`ai-field${listening ? " is-listening" : closing ? " is-closing" : ""}`}>
        <label htmlFor="ai-q" className="sr-only">Pertanyaan untuk asisten</label>
        <textarea id="ai-q" ref={input} rows={1} value={draft} maxLength={500} placeholder="Tanya apa saja soal pabrik..."
          readOnly={listening} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(draft); } }} />
        {canDictate && <VoicePill key={pillKey} size={44} accentColor="#ffffff" iconColor="var(--color-on-surface-muted)" background="var(--color-primary)" reactive={finePointer ? "mic" : "simulated"} ariaLabel="Bicara untuk mengetik" onStart={startVoice} onStop={({ reason }) => stopVoice(reason)} />}
        <button type="submit" className="ai-send" disabled={!draft.trim() || thinking || typing !== null || listening} aria-label="Kirim pertanyaan"><ArrowUp size={18} /></button>
      </div>
    </form>
    <p className="ai-note" role={voiceError ? "alert" : undefined}>{voiceError || (listening ? "Mendengarkan. Tekan kotak untuk selesai." : "Jawaban dari data simulasi, belum memakai AI generatif.")}</p>
  </section>;
}
