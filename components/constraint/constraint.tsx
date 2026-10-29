"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CircleCheck, CircleX, RotateCcw, Save } from "lucide-react";
import { scenario } from "@/lib/data";
import { number } from "@/lib/format";
import { setLimits, useDemo } from "@/lib/demo";
import { can } from "@/lib/roles";
import { DEFAULT_LIMITS, evaluate, violations, type ConstraintId, type Limits } from "@/lib/rules";
import { Badge, Card, Icon, PageHeading, RoleNote, SectionTitle, SourceButton, SourceModal } from "@/components/ui";

type NumberKey = { [K in keyof Limits]: Limits[K] extends number ? K : never }[keyof Limits];
type ToggleKey = { [K in keyof Limits]: Limits[K] extends boolean ? K : never }[keyof Limits];
type RangeParam = { key: NumberKey; label: string; unit: string; min: number; max: number; step: number; format?: (v: number) => string };
type Param = RangeParam | { key: ToggleKey; label: string; hint: string };
const hm = (v: number) => `${Math.floor(v / 60)}j ${String(v % 60).padStart(2, "0")}m`;

/** Enam constraint dengan definisi dari materi Greenfields ("Configuration Constraint"). */
const CONSTRAINTS: { id: ConstraintId; what: string; params: Param[] }[] = [
  { id: "flow", what: "Kecepatan transfer dan proses membatasi throughput. Lini filling tidak boleh kehabisan pasokan.", params: [
    { key: "maxTransfer", label: "Max transfer rate UHT ke aseptic tank", unit: "L/jam", min: 7_000, max: 12_000, step: 100, format: v => `${number(v)} L/jam` },
    { key: "starvationTol", label: "Toleransi jeda pasokan filling", unit: "menit", min: 0, max: 60, step: 5 },
  ] },
  { id: "maintenance", what: "Waktu siap aset memengaruhi jadwal. Aset dalam maintenance window tidak boleh dipakai.", params: [
    { key: "maintenanceBay3", label: "Uji maintenance window Bay 3, 16.00 - 16.30", hint: "Lihat apakah rencana masih layak bila Bay 3 diservis." },
  ] },
  { id: "holding", what: "Bahan harus diproses dalam batas waktu sebelum tahap berikutnya, diperiksa per tahap.", params: [
    { key: "holdingMin", label: "Farm sampai tersimpan dingin", unit: "menit", min: 480, max: 720, step: 10, format: hm },
    { key: "bufferMaxMin", label: "Raw Milk Buffer sampai thermal", unit: "menit", min: 720, max: 1_440, step: 30, format: hm },
  ] },
  { id: "cip", what: "Cleaning, kerusakan, dan stop memotong produksi.", params: [
    { key: "cipBuffer", label: "Jeda setelah CIP bay", unit: "menit", min: 0, max: 30, step: 5 },
    { key: "breakdownF1", label: "Uji breakdown Filling F1, 16.30 - 17.00", hint: "Simulasi kerusakan mesin di tengah jadwal." },
  ] },
  { id: "tank", what: "Ruang tangki membatasi receiving dan buffer. Tangki penuh atau CIP tidak bisa menerima.", params: [
    { key: "tankMax", label: "Batas level Raw Milk Buffer", unit: "%", min: 85, max: 100, step: 1 },
  ] },
  { id: "changeover", what: "Transisi produk mengikuti SOP: urutan dan waktu cleaning minimum untuk paper, size, dan flavor.", params: [
    { key: "changeoverMax", label: "Changeover maksimum", unit: "per lini per shift", min: 0, max: 4, step: 1 },
  ] },
];
const show = (p: RangeParam, v: number) => p.format ? p.format(v) : `${number(v)} ${p.unit}`;
const describe = (from: Limits, to: Limits) => CONSTRAINTS.flatMap(c => c.params).filter(p => from[p.key] !== to[p.key])
  .map(p => "unit" in p ? `${p.label} ${show(p, from[p.key])} → ${show(p, to[p.key])}` : `${p.label} ${to[p.key] ? "diaktifkan" : "dimatikan"}`).join("; ");

export function Constraint() {
  const demo = useDemo();
  const [draft, setDraft] = useState<Limits | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const limits = draft ?? demo.limits;
  const allowed = can(demo.role, "constraint.edit");
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(demo.limits);
  const isDefault = JSON.stringify(limits) === JSON.stringify(DEFAULT_LIMITS);
  const edit = (patch: Partial<Limits>) => setDraft({ ...limits, ...patch });
  const meta = scenario.plans[0].constraints;

  return <div className="page-enter">
    <PageHeading title="Constraint" subtitle="Bisakah rencana berjalan sesuai jadwal? Enam constraint diuji pada setiap rencana. Ubah batasnya, lihat dampaknya langsung, lalu simpan.">
      <button className="button secondary" disabled={!allowed || isDefault} onClick={() => setDraft(DEFAULT_LIMITS)}><Icon icon={RotateCcw} size={16} />Nilai awal</button>
      <button className="button primary" disabled={!allowed || !dirty} onClick={() => { setLimits(draft!, describe(demo.limits, draft!)); setDraft(null); }}><Icon icon={Save} size={16} />Simpan batas</button>
    </PageHeading>
    <RoleNote permission="constraint.edit" />
    {dirty && <div className="decision-banner warn" role="status"><Icon icon={Save} /><span><strong>Perubahan belum disimpan</strong><span>{describe(demo.limits, draft!)}. Pratinjau di bawah sudah memakai nilai baru.</span></span></div>}
    <div className="metrics-grid">{scenario.plans.flatMap(plan => (["before", "after"] as const).map(view => { const n = violations(plan, view, limits); return <Card key={`${plan.id}-${view}`} className="metric-card"><span className="metric-label">{plan.id === "current" ? "Rencana shift" : "What-if CIP molor"} · {view === "before" ? "awal" : "rekomendasi"}</span><p className="metric-value">{n}<span>dari 6 dilanggar</span></p><Badge tone={n ? "crit" : "ok"}>{n ? "Tidak layak" : "Layak"}</Badge></Card>; }))}</div>
    <div className="constraint-grid">{CONSTRAINTS.map(c => {
      const m = meta.find(x => x.id === c.id)!;
      const checks = (["before", "after"] as const).map(view => ({ view, ...evaluate(scenario.plans[0], view, limits)[c.id] }));
      return <Card key={c.id}>
        <SectionTitle title={m.label} subtitle={c.what} />
        {c.params.map(p => "unit" in p
          ? <label key={p.key} className="limit-field"><span>{p.label}<small>{show(p, limits[p.key])}{limits[p.key] !== DEFAULT_LIMITS[p.key] && ` · awal ${show(p, DEFAULT_LIMITS[p.key])}`} [asumsi]</small></span>
            <input type="range" aria-label={p.label} min={p.min} max={p.max} step={p.step} value={limits[p.key]} disabled={!allowed} onChange={e => edit({ [p.key]: Number(e.target.value) })} aria-valuetext={show(p, limits[p.key])} /></label>
          : <label key={p.key} className="limit-check"><input type="checkbox" checked={limits[p.key]} disabled={!allowed} onChange={e => edit({ [p.key]: e.target.checked })} /><span>{p.label}<small>{p.hint}</small></span></label>)}
        <ul className="verdict-list">{checks.map(v => <li key={v.view} className={`check ${v.ok ? "ok" : "crit"}`}><Icon icon={v.ok ? CircleCheck : CircleX} size={16} /><span><strong>{v.view === "before" ? "Rencana awal" : "Rekomendasi"}: {v.ok ? "terpenuhi" : "dilanggar"}</strong>{v.text}</span></li>)}</ul>
        <SourceButton id={m.source} onSelect={setSource} compact />
      </Card>;
    })}</div>
    <p className="small muted">Pemeriksaan di mockup memakai aturan sederhana pada jadwal skenario. Di prototipe, solver CP-SAT menyusun ulang jadwal dengan batas yang sama. <Link className="inline-link" href="/rencana">Lihat dampaknya di Rencana & What-if<Icon icon={ArrowRight} size={12} /></Link></p>
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
