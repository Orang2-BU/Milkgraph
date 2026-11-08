"use client";

import { createContext, useContext, useState } from "react";
import { Clock3, RotateCcw, Trash2, TriangleAlert, Wrench, X, Zap } from "lucide-react";
import { Badge, Icon } from "@/components/ui";
import { Equipment, KIND_LABEL } from "@/components/trace/equipment";
import { FlowCanvas, type AsideProps } from "@/components/alur/flow-canvas";
import { useDemo } from "@/lib/demo";
import { evaluate, transferNeed } from "@/lib/rules";
import type { Plan } from "@/mock/types";
import { applyToLimits, badgeOf, effectNote, isModelled, type Adjust, type Adjustments } from "./adjust";
import { capacityRoom } from "./recommend";
import { asepticTanks, fillers } from "@/mock/ops";
import { ASSETS, LINKS, STAGES } from "@/lib/assets";
import { PlanChat } from "./plan-chat";
import { answer } from "./plan-answer";
import { HORIZON, NOW, clock, toOffset, events, projectBlocks, projectChecks, statusAt, type View } from "./projection";

const STARTS = ["13.30", "14.00", "14.30", "15.00", "15.30", "16.00", "16.30", "17.00", "17.30", "18.00", "18.30", "19.00"];
const DURATIONS = [15, 30, 45, 60, 90];
const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

const Ctx = createContext<{ adj: Adjustments; set: (id: string, a: Adjust) => void; jump: (t: number) => void }>({ adj: {}, set: () => {}, jump: () => {} });

/** Panel atur alat: upgrade kapasitas dan maintenance. Efeknya langsung terlihat di alur pada jam yang dipilih. */
function PlanEditor({ asset, onClose }: AsideProps) {
  const { adj, set, jump } = useContext(Ctx);
  const a = adj[asset.id] ?? {};
  const update = (patch: Partial<Adjust>) => set(asset.id, { ...a, ...patch });
  const setMaint = (m: Adjust["maintenance"]) => { update({ maintenance: m }); if (m) jump(Number(m.start.slice(0, 2)) * 60 + Number(m.start.slice(3)) - 780 + 5); };
  const up = effectNote(asset.id, "upgrade"), mt = effectNote(asset.id, "maintenance");
  // Poin 16: planner mengisi kapasitas baru sendiri; angka awal dan batas yang terpakai dihitung dari data jalur.
  const room = capacityRoom(asepticTanks, fillers, asset.id);
  const [draft, setDraft] = useState<string | null>(null);
  const cap = room ? a.upgradeTo ?? room.from : 0;
  const extra = room ? Math.max(0, cap - room.from) : 0, used = room ? Math.min(extra, room.room) : 0;
  const pctText = room ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(extra / room.from * 100) : "0";
  const setCap = (v: number) => { if (!room || !Number.isFinite(v)) return; update(v > room.from ? { upgrade: (v - room.from) / room.from * 100, upgradeTo: v } : { upgrade: undefined, upgradeTo: undefined }); };
  return <aside className="flow-inspector plan-editor" aria-label={`Atur rencana ${asset.id}`}>
    <header>
      <Equipment kind={asset.kind} size={44} />
      <div><h2>{asset.id}</h2><p>{KIND_LABEL[asset.kind] ?? asset.kind}</p></div>
      <button className="icon-button" aria-label="Tutup panel atur alat" onClick={onClose}><Icon icon={X} size={18} /></button>
    </header>
    <Badge tone={asset.tone}>Di jam ini: {asset.status}</Badge>

    <fieldset className="plan-field">
      <legend><Icon icon={Zap} size={15} />Kapasitas</legend>
      {room ? <>
        <div className="plan-cap">
          <label htmlFor={`cap-${asset.id}`}>Kapasitas baru</label>
          <div><input id={`cap-${asset.id}`} type="number" inputMode="numeric" min={room.from} step={10} value={draft ?? String(cap)} onChange={e => { setDraft(e.target.value); if (Number(e.target.value) >= room.from) setCap(Number(e.target.value)); }} onBlur={() => setDraft(null)} /><span>L/jam</span></div>
          <small>Sekarang {fmt(room.from)} L/jam</small>
        </div>
        <div className="plan-chips">
          {room.room > 0 && <button type="button" className={cap === room.from + room.room ? "selected" : ""} onClick={() => { setDraft(null); setCap(room.from + room.room); }}>Sesuai kebutuhan: {fmt(room.from + room.room)}</button>}
          <button type="button" className={cap === room.from ? "selected" : ""} onClick={() => { setDraft(null); setCap(room.from); }}>Tanpa upgrade</button>
        </div>
        <p className="small muted">{extra > 0
          ? `Naik ${fmt(extra)} L/jam (${pctText}%). Yang terpakai jalur ${room.line}: +${fmt(used)} L/jam, sekitar +${fmt(used * 8)} L per shift.${extra > used ? ` Sisa ${fmt(extra - used)} L/jam tidak terpakai.` : ""}${room.why ? ` ${room.why}` : ""}`
          : room.room > 0 ? `Jalur ${room.line} masih bisa memakai tambahan sampai ${fmt(room.room)} L/jam.` : room.why || "Upgrade tidak menambah produksi."}</p>
        {extra > 0 && <p className="small muted">{up ?? "Efeknya ke jadwal belum dimodelkan [simulasi]."}</p>}
      </> : <p className="small muted">Laju alat ini (L/jam) belum ada di data, jadi kapasitasnya belum bisa diatur [simulasi].</p>}
    </fieldset>

    <fieldset className="plan-field">
      <legend><Icon icon={Wrench} size={15} />Maintenance</legend>
      <label className="check-row"><input type="checkbox" checked={!!a.maintenance} onChange={e => setMaint(e.target.checked ? { start: "15.00", minutes: 30 } : undefined)} />Jadwalkan maintenance di shift ini</label>
      {a.maintenance && <>
        <div className="plan-row">
          <label><span>Mulai pukul</span><select value={a.maintenance.start} onChange={e => setMaint({ ...a.maintenance!, start: e.target.value })}>{STARTS.map(s => <option key={s}>{s}</option>)}</select></label>
          <label><span>Selama</span><select value={a.maintenance.minutes} onChange={e => setMaint({ ...a.maintenance!, minutes: Number(e.target.value) })}>{DURATIONS.map(d => <option key={d} value={d}>{d} menit</option>)}</select></label>
        </div>
        <p className="small muted">{mt ?? "Status alat ini berubah jadi Maintenance pada jam itu. Efeknya ke alat lain belum dimodelkan [simulasi]."}</p>
      </>}
    </fieldset>

    {(a.upgrade || a.maintenance) && <button type="button" className="button secondary wide" onClick={() => set(asset.id, {})}><Icon icon={Trash2} size={16} />Hapus pengaturan {asset.id}</button>}
  </aside>;
}

/**
 * Tab Alur rencana (poin 9): konsep alur yang sama dengan Operasional, tapi status tiap alat mengikuti jadwal rencana
 * pada jam yang dipilih. Pengaturan alat langsung mengubah alur: bongkar yang bentrok dan filling yang berhenti tampil merah.
 * Ini pratinjau di halaman Rencana saja; batas di halaman Constraint dan keputusan rencana tidak berubah.
 */
export function PlanFlow({ plan, adj, setAdj, view, setView, mode = "2d" }: { plan: Plan; adj: Adjustments; setAdj: React.Dispatch<React.SetStateAction<Adjustments>>; view: View; setView: (v: View) => void; mode?: "2d" | "3d" }) {
  const demo = useDemo();
  const [t, setT] = useState(NOW);
  const [picked, setPicked] = useState<string | null>(null);
  const set = (id: string, a: Adjust) => setAdj(prev => {
    const next = { ...prev };
    if (a.upgrade || a.maintenance) next[id] = a; else delete next[id];
    return next;
  });

  const limits = applyToLimits(demo.limits, adj);
  const project = (v: View) => {
    const blocks = projectBlocks(plan[v], transferNeed(v), adj, demo.limits.maxTransfer);
    return { blocks, broken: Object.values(projectChecks(evaluate, plan, v, blocks, limits)).filter(c => !c.ok).length };
  };
  const base = (v: View) => Object.values(evaluate(plan, v, demo.limits)).filter(c => !c.ok).length;
  const proj = { before: project("before"), after: project("after") };
  const blocks = proj[view].blocks;
  const overrides = statusAt(blocks, t, adj);
  const list = events(blocks);
  const ids = Object.keys(adj);
  const badges = Object.fromEntries(ids.map(id => [id, badgeOf(adj[id])!]));
  const unmodelled = ids.filter(id => !isModelled(id, adj[id]));

  const toolbar = <div className="plan-controls">
    <label className="plan-pick"><span>Alat</span><select value={picked ?? ""} onChange={e => setPicked(e.target.value || null)}>
      <option value="">Pilih alat untuk diatur...</option>
      {STAGES.map(st => <optgroup key={st} label={st}>{ASSETS.filter(x => x.stage === st).map(x => <option key={x.id} value={x.id}>{x.id}{adj[x.id] ? " (diatur)" : ""}</option>)}</optgroup>)}
    </select></label>
    <div className="plan-time">
      <label htmlFor="plan-time"><Icon icon={Clock3} size={15} />Jam <strong>{clock(t)}</strong>{t === NOW ? <span className="muted">(sama dengan operasi sekarang)</span> : <button type="button" className="inline-link" onClick={() => setT(NOW)}>Kembali ke {clock(NOW)}</button>}</label>
      <input id="plan-time" type="range" min={0} max={HORIZON} step={5} value={t} onChange={e => setT(Number(e.target.value))} aria-valuetext={`Pukul ${clock(t)}`} />
      <div className="plan-ticks" aria-hidden="true"><span>13.00</span><span>16.30</span><span>20.00</span></div>
    </div>
    {list.length > 0 && <div className="plan-events" aria-label="Kejadian penting">
      {list.map(e => <button key={`${e.at}-${e.text}`} type="button" className={`plan-event ${e.tone} ${t >= e.at && t < e.at + 30 ? "is-now" : ""}`} onClick={() => setT(e.at + 5)}><Icon icon={e.tone === "crit" ? TriangleAlert : Wrench} size={13} /><strong>{clock(e.at)}</strong>{e.text}</button>)}
    </div>}
  </div>;

  // Usulan dari chat: gabungkan ke pengaturan alat, pilih alatnya, dan lompat ke jam maintenance bila ada.
  const apply = (id: string, a: Adjust) => { set(id, { ...adj[id], ...a }); setPicked(id); if (a.maintenance) setT(toOffset(a.maintenance.start) + 5); };
  return <Ctx.Provider value={{ adj, set, jump: setT }}>
    <div className="plan-layout">
    <PlanChat onAsk={(q, d) => answer({ plan, adj, limits: demo.limits, evaluate, need: { before: transferNeed("before"), after: transferNeed("after") }, tanks: asepticTanks, fillers, links: LINKS, assets: ASSETS }, view, q, d)} onApply={apply} />
    <div className="plan-main">
    <section className="plan-summary" aria-live="polite">
      {(["before", "after"] as const).map(v => <button key={v} type="button" className={`card plan-metric ${view === v ? "selected" : ""}`} aria-pressed={view === v} onClick={() => setView(v)}>
        <span>{v === "before" ? "Rencana awal (FIFO)" : "Rekomendasi solver"}</span>
        <strong>{proj[v].broken} <small>dari 6 constraint dilanggar</small></strong>
        {proj[v].broken !== base(v) ? <em>sebelum diatur: {base(v)}</em> : <em className="muted">{view === v ? "Sedang ditampilkan di alur" : "Klik untuk melihat di alur"}</em>}
      </button>)}
      <div className="card plan-changes">
        <span>{ids.length ? `${ids.length} alat diatur` : "Klik alat di alur untuk mengatur upgrade atau maintenance"}</span>
        {ids.length > 0 && <ul>{ids.map(id => <li key={id}><strong className="mono">{id}</strong> {badges[id]}{!isModelled(id, adj[id]) && <span className="muted"> (efek lanjutan belum dimodelkan)</span>}</li>)}</ul>}
        {ids.length > 0 && <button type="button" className="inline-link" onClick={() => setAdj({})}><Icon icon={RotateCcw} size={14} />Kembalikan seperti operasional</button>}
      </div>
    </section>
    <FlowCanvas mode={mode} picked={picked} onPickedChange={setPicked} label="Alur rencana produksi" badges={badges} overrides={overrides} aside={PlanEditor} toolbar={toolbar}
      hint={unmodelled.length ? `${unmodelled.length} pengaturan efek lanjutannya belum dimodelkan [simulasi]` : "Geser jam untuk melihat kondisi alat. Klik alat untuk mengaturnya."} />
    <p className="small muted plan-note">Ini pratinjau di halaman Rencana saja [simulasi]. Batas di halaman Constraint dan keputusan rencana tidak ikut berubah.</p>
    </div>
    </div>
  </Ctx.Provider>;
}
