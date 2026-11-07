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
import { HORIZON, clock, events, projectBlocks, projectChecks, statusAt, type View } from "./projection";

const UPGRADES = [0, 10, 25, 50];
const STARTS = ["13.30", "14.00", "14.30", "15.00", "15.30", "16.00", "16.30", "17.00", "17.30", "18.00", "18.30", "19.00"];
const DURATIONS = [15, 30, 45, 60, 90];
const NOW = 102;

const Ctx = createContext<{ adj: Adjustments; set: (id: string, a: Adjust) => void; jump: (t: number) => void }>({ adj: {}, set: () => {}, jump: () => {} });

/** Panel atur alat: upgrade kapasitas dan maintenance. Efeknya langsung terlihat di alur pada jam yang dipilih. */
function PlanEditor({ asset, onClose }: AsideProps) {
  const { adj, set, jump } = useContext(Ctx);
  const a = adj[asset.id] ?? {};
  const update = (patch: Partial<Adjust>) => set(asset.id, { ...a, ...patch });
  const setMaint = (m: Adjust["maintenance"]) => { update({ maintenance: m }); if (m) jump(Number(m.start.slice(0, 2)) * 60 + Number(m.start.slice(3)) - 780 + 5); };
  const up = effectNote(asset.id, "upgrade"), mt = effectNote(asset.id, "maintenance");
  return <aside className="flow-inspector plan-editor" aria-label={`Atur rencana ${asset.id}`}>
    <header>
      <Equipment kind={asset.kind} size={44} />
      <div><h2>{asset.id}</h2><p>{KIND_LABEL[asset.kind] ?? asset.kind}</p></div>
      <button className="icon-button" aria-label="Tutup panel atur alat" onClick={onClose}><Icon icon={X} size={18} /></button>
    </header>
    <Badge tone={asset.tone}>Di jam ini: {asset.status}</Badge>

    <fieldset className="plan-field">
      <legend><Icon icon={Zap} size={15} />Upgrade kapasitas</legend>
      <div className="toggle plan-seg" role="radiogroup" aria-label="Kenaikan kapasitas">
        {UPGRADES.map(u => <button key={u} type="button" role="radio" aria-checked={(a.upgrade ?? 0) === u} className={(a.upgrade ?? 0) === u ? "selected" : ""} onClick={() => update({ upgrade: u || undefined })}>{u ? `+${u}%` : "Tidak"}</button>)}
      </div>
      {a.upgrade ? <p className="small muted">{up ?? "Efek upgrade alat ini ke alur belum dimodelkan [simulasi]. Perubahannya tetap dicatat di rencana."}</p> : null}
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
export function PlanFlow({ plan }: { plan: Plan }) {
  const demo = useDemo();
  const [adj, setAdj] = useState<Adjustments>({});
  const [view, setView] = useState<View>("before");
  const [t, setT] = useState(NOW);
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
    <div className="plan-time">
      <label htmlFor="plan-time"><Icon icon={Clock3} size={15} />Jam <strong>{clock(t)}</strong>{t === NOW && <span className="muted">(snapshot)</span>}</label>
      <input id="plan-time" type="range" min={0} max={HORIZON} step={5} value={t} onChange={e => setT(Number(e.target.value))} aria-valuetext={`Pukul ${clock(t)}`} />
      <div className="plan-ticks" aria-hidden="true"><span>13.00</span><span>16.30</span><span>20.00</span></div>
    </div>
    {list.length > 0 && <div className="plan-events" aria-label="Kejadian penting">
      {list.map(e => <button key={`${e.at}-${e.text}`} type="button" className={`plan-event ${e.tone} ${t >= e.at && t < e.at + 30 ? "is-now" : ""}`} onClick={() => setT(e.at + 5)}><Icon icon={e.tone === "crit" ? TriangleAlert : Wrench} size={13} /><strong>{clock(e.at)}</strong>{e.text}</button>)}
    </div>}
  </div>;

  return <Ctx.Provider value={{ adj, set, jump: setT }}>
    <section className="plan-summary" aria-live="polite">
      {(["before", "after"] as const).map(v => <button key={v} type="button" className={`plan-metric ${view === v ? "selected" : ""}`} aria-pressed={view === v} onClick={() => setView(v)}>
        <span>{v === "before" ? "Rencana awal (FIFO)" : "Rekomendasi solver"}</span>
        <strong>{proj[v].broken} <small>dari 6 constraint dilanggar</small></strong>
        {proj[v].broken !== base(v) ? <em>sebelum diatur: {base(v)}</em> : <em className="muted">{view === v ? "Sedang ditampilkan di alur" : "Klik untuk melihat di alur"}</em>}
      </button>)}
      <div className="plan-changes">
        <span>{ids.length ? `${ids.length} alat diatur` : "Klik alat di alur untuk mengatur upgrade atau maintenance"}</span>
        {ids.length > 0 && <ul>{ids.map(id => <li key={id}><strong className="mono">{id}</strong> {badges[id]}{!isModelled(id, adj[id]) && <span className="muted"> (efek lanjutan belum dimodelkan)</span>}</li>)}</ul>}
        {ids.length > 0 && <button type="button" className="inline-link" onClick={() => setAdj({})}><Icon icon={RotateCcw} size={14} />Kembalikan seperti operasional</button>}
      </div>
    </section>
    <FlowCanvas label="Alur rencana produksi" badges={badges} overrides={overrides} aside={PlanEditor} toolbar={toolbar}
      hint={unmodelled.length ? `${unmodelled.length} pengaturan efek lanjutannya belum dimodelkan [simulasi]` : "Geser jam untuk melihat kondisi alat. Klik alat untuk mengaturnya."} />
    <p className="small muted plan-note">Ini pratinjau di halaman Rencana saja [simulasi]. Batas di halaman Constraint dan keputusan rencana tidak ikut berubah.</p>
  </Ctx.Provider>;
}
