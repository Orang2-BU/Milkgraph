"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, FileText, PackageCheck, PackageX, ShieldAlert, Truck, X } from "lucide-react";
import { scenario } from "@/lib/data";
import { number } from "@/lib/format";
import { reviewHold, useDemo, type Hold, type HoldStatus } from "@/lib/demo";
import { can } from "@/lib/roles";
import { pastHolds } from "@/mock/ops";
import { Badge, Card, Icon, Modal, PageHeading, RoleNote, SectionTitle } from "@/components/ui";
import type { Tone } from "@/mock/types";
import { GenealogyReport, lotAction } from "@/components/trace/genealogy";

const STATUS: Record<HoldStatus, { label: string; tone: Tone }> = { diajukan: { label: "Menunggu QA", tone: "warn" }, aktif: { label: "Hold aktif", tone: "crit" }, ditolak: { label: "Ditolak QA", tone: "neutral" }, dilepas: { label: "Dilepas", tone: "ok" } };
const ACTION: Record<Exclude<HoldStatus, "diajukan">, { title: string; button: string; text: string; noteRequired: boolean }> = {
  aktif: { title: "Setujui hold dan recall?", button: "Konfirmasi", text: "Lot di gudang ditahan dan lot yang sudah dikirim ditarik kembali, sampai QA melepasnya.", noteRequired: false },
  ditolak: { title: "Tolak pengajuan hold?", button: "Konfirmasi penolakan", text: "Lot tetap boleh dikirim. Alasan diperlukan agar keputusan dapat ditelusuri.", noteRequired: true },
  dilepas: { title: "Lepas hold?", button: "Konfirmasi pelepasan", text: "Lot kembali boleh dikirim. Cantumkan hasil uji ulang sebagai dasar.", noteRequired: true },
};
const packsOf = (h: Hold) => h.lots.reduce((sum, l) => sum + l.packs, 0);

export function HoldList() {
  const demo = useDemo();
  const holds = [...demo.holds, ...pastHolds];
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Exclude<HoldStatus, "diajukan"> | null>(null);
  const [note, setNote] = useState("");
  const [report, setReport] = useState(false);
  const allowed = can(demo.role, "hold.review");
  const open = holds.find(h => h.id === openId) ?? holds[0];
  const editable = !!open && demo.holds.some(h => h.id === open.id);
  const active = holds.filter(h => h.status === "aktif");
  const recalls = active.flatMap(h => h.lots).filter(l => lotAction(l.id).shipped);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!open || !dialog || (ACTION[dialog].noteRequired && !note.trim())) return;
    reviewHold(open.id, dialog, note.trim());
    setDialog(null); setNote("");
  }

  return <div className="page-enter">
    <PageHeading title="Daftar Hold" subtitle="Lot yang diajukan hold atau recall dari hasil trace, beserta keputusan QA. Sistem tidak menahan atau menarik produk otomatis." />
    <div className="metrics-grid">
      <Card className="metric-card"><span className="metric-label"><Icon icon={ShieldAlert} size={15} />Menunggu QA</span><p className="metric-value">{holds.filter(h => h.status === "diajukan").length}<span>pengajuan</span></p></Card>
      <Card className="metric-card"><span className="metric-label"><Icon icon={PackageX} size={15} />Hold aktif</span><p className="metric-value">{active.reduce((s, h) => s + h.lots.length, 0)}<span>lot · {number(active.reduce((s, h) => s + packsOf(h), 0))} pak</span></p></Card>
      <Card className="metric-card"><span className="metric-label"><Icon icon={Truck} size={15} />Perlu recall</span><p className="metric-value">{recalls.length}<span>lot sudah dikirim</span></p></Card>
      <Card className="metric-card"><span className="metric-label"><Icon icon={PackageCheck} size={15} />Tanpa genealogi volume</span><p className="metric-value">{scenario.holdBaseline.lots}<span>lot · {number(scenario.holdBaseline.packs)} pak [simulasi]</span></p></Card>
    </div>
    {!demo.holds.length && <section className="callout"><Icon icon={PackageX} size={18} /><div><strong>Belum ada pengajuan hold di demo ini</strong><p>Jalankan trace maju dari RT-04 di halaman Traceability, lalu ajukan daftar hold ke QA.</p></div><Link className="text-link" href="/trace">Buka Traceability<Icon icon={ArrowRight} size={14} /></Link></section>}
    <div className="kg-layout">
      <Card><SectionTitle title="Pengajuan hold" /><div className="table-wrap"><table className="select-table"><thead><tr><th>Pengajuan</th><th>Pemicu</th><th className="numeric">Lot</th><th className="numeric">Pak</th><th>Status</th></tr></thead><tbody>{holds.map(h => <tr key={h.id} className={open?.id === h.id ? "selected" : ""}><td><button className="row-button" aria-pressed={open?.id === h.id} onClick={() => setOpenId(h.id)}><strong className="mono">{h.id}</strong></button><span className="table-sub">{h.by} · {h.at}</span></td><td data-label="Pemicu"><span className="mono">{h.trigger}</span><span className="table-sub">Sumber {h.rt}</span></td><td data-label="Lot" className="numeric">{h.lots.length}</td><td data-label="Pak" className="numeric">{number(packsOf(h))}</td><td data-label="Status"><Badge tone={STATUS[h.status].tone}>{STATUS[h.status].label}</Badge></td></tr>)}</tbody></table></div></Card>
      <aside className="kg-detail" aria-live="polite">{open && <>
        <div className="kg-detail-top"><Badge tone={STATUS[open.status].tone}>{STATUS[open.status].label}</Badge><span className="mono small">{open.id}</span></div>
        <h2>{open.lots.length} lot dari {open.rt}</h2>
        <p className="small muted">Pemicu {open.trigger}. Diajukan {open.by}, {open.at}.{open.note && ` "${open.note}"`}</p>
        <ul className="hold-list">{open.lots.map(lot => { const at = lotAction(lot.id); return <li key={lot.id}><span className="mono">{lot.id}</span><span>{lot.percent}% {open.rt} · {number(lot.packs)} pak</span><span className={at.shipped ? "crit-text" : ""}>{at.shipped ? "Recall" : "Hold"}: {at.place}</span></li>; })}</ul><button className="text-link" onClick={() => setReport(true)}><Icon icon={FileText} size={15} />Laporan genealogi</button>
        {open.review && <p className="small"><strong>{STATUS[open.status].label}</strong> oleh {open.review.by}, {open.review.at}. {open.review.note}</p>}
        {editable && open.status === "diajukan" && <div className="page-actions"><button className="button secondary" disabled={!allowed} onClick={() => { setNote(""); setDialog("ditolak"); }}><Icon icon={X} size={16} />Tolak</button><button className="button primary" disabled={!allowed} onClick={() => { setNote(""); setDialog("aktif"); }}><Icon icon={Check} size={16} />Setujui hold</button></div>}
        {editable && open.status === "aktif" && <button className="button secondary" disabled={!allowed} onClick={() => { setNote(""); setDialog("dilepas"); }}><Icon icon={PackageCheck} size={16} />Lepas hold</button>}
        {editable && (open.status === "diajukan" || open.status === "aktif") && <RoleNote permission="hold.review" />}
        {!editable && <p className="small muted">Riwayat sebelum demo, hanya bisa dibaca.</p>}
      </>}</aside>
    </div>
    {report && open && <GenealogyReport hold={open} onClose={() => setReport(false)} />}
    {dialog && open && <Modal title={ACTION[dialog].title} onClose={() => setDialog(null)}><form onSubmit={submit}><Badge>Data simulasi</Badge><p className="dialog-summary">{open.id}: {open.lots.length} lot, {number(packsOf(open))} pak. {ACTION[dialog].text}</p><label className="field-label" htmlFor="hold-review-note">Catatan {ACTION[dialog].noteRequired ? "(wajib)" : "(opsional)"}</label><textarea id="hold-review-note" value={note} onChange={e => setNote(e.target.value)} required={ACTION[dialog].noteRequired} maxLength={500} placeholder={dialog === "dilepas" ? "Contoh: uji ulang sampel retensi negatif." : dialog === "ditolak" ? "Contoh: kontribusi RT-04 di bawah ambang deteksi." : "Contoh: ambil sampel retensi semua lot untuk uji ulang."} /><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => setDialog(null)}>Batal</button><button className="button primary" disabled={ACTION[dialog].noteRequired && !note.trim()}>{ACTION[dialog].button}<Icon icon={Check} size={16} /></button></div></form></Modal>}
  </div>;
}
