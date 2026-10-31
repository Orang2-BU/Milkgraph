"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, CircleCheck, CircleDashed, CircleX, FlaskConical, X } from "lucide-react";
import { decideLab, useDemo, type LabDecision } from "@/lib/demo";
import { can } from "@/lib/roles";
import { labResults, type LabResult } from "@/mock/ops";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { Badge, Card, Icon, Modal, PageHeading, RoleNote, SectionTitle, SourceButton, SourceModal, Toggle } from "@/components/ui";
import type { Tone } from "@/mock/types";

const STATUS: Record<LabResult["status"], { label: string; tone: Tone }> = {
  "hasil-siap": { label: "Menunggu rilis QA", tone: "warn" },
  "uji-ulang": { label: "Uji ulang", tone: "warn" },
  "dalam-uji": { label: "Dalam uji", tone: "neutral" },
  lulus: { label: "Lulus, dirilis", tone: "ok" },
  positif: { label: "Out-of-spec", tone: "crit" },
};
const decided = (d: LabDecision) => ({ label: d.status === "dirilis" ? "Dirilis QA" : "Ditolak QA", tone: (d.status === "dirilis" ? "ok" : "crit") as Tone });
const decidable = (r: LabResult) => r.kind === "penerimaan" && (r.status === "hasil-siap" || r.status === "uji-ulang");

type LabResultItem = LabResult & { decision?: LabDecision; eta?: string };

export function Lab() {
  const demo = useDemo();
  const [kind, setKind] = useState<LabResult["kind"]>("penerimaan");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"dirilis" | "ditolak" | null>(null);
  const [note, setNote] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resultsRes = useResource<LabResultItem[]>(API_MODE ? (kind ? `/lab/results?kind=${kind}` : "/lab/results") : null);
  const summaryRes = useResource<{ waiting: number; released: number; avgWaitMin: number }>(API_MODE ? "/lab/summary" : null);

  if (API_MODE && (!resultsRes.data || !summaryRes.data)) {
    if (resultsRes.error || summaryRes.error) {
      const err = resultsRes.error ?? summaryRes.error;
      return (
        <div className="page-enter" role="status">
          <p className="crit-text">Gagal memuat Hasil Lab: {err?.message}</p>
        </div>
      );
    }
    return <div className="page-enter" role="status"><p className="muted">Memuat Hasil Lab…</p></div>;
  }

  const allowed = can(demo.role, "lab.decide");
  const rows: LabResultItem[] = API_MODE ? (resultsRes.data ?? []) : labResults.filter(r => r.kind === kind);
  const open = rows.find(r => r.id === openId);
  const badge = (r: LabResultItem) => r.decision ? decided(r.decision) : demo.labs[r.id] ? decided(demo.labs[r.id]) : STATUS[r.status];
  const waiting = API_MODE ? (summaryRes.data?.waiting ?? 0) : labResults.filter(r => decidable(r) && !demo.labs[r.id]).length;
  const released = API_MODE ? (summaryRes.data?.released ?? 0) : labResults.filter(r => r.kind === "penerimaan" && (r.status === "lulus" || demo.labs[r.id]?.status === "dirilis")).length;
  const avgWait = API_MODE ? (summaryRes.data?.avgWaitMin ?? 0) : 52;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!open || !dialog || (dialog === "ditolak" && !note.trim())) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await decideLab(open.id, open.subject, dialog, note.trim());
      setDialog(null);
      setNote("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="page-enter">
    <PageHeading title="Hasil Lab" subtitle="Hasil lab test penerimaan RT dan QC barang jadi dari LIMS. Lab test adalah gerbang antrean receiving." />
    <div className="metrics-grid three">
      <Card className="metric-card"><span className="metric-label"><Icon icon={FlaskConical} size={15} />Menunggu keputusan QA</span><p className="metric-value">{waiting}<span>RT</span></p></Card>
      <Card className="metric-card"><span className="metric-label"><Icon icon={CircleCheck} size={15} />Dirilis hari ini</span><p className="metric-value">{released}<span>RT</span></p></Card>
      <Card className="metric-card"><span className="metric-label"><Icon icon={CircleDashed} size={15} />Rata-rata tunggu lab</span><p className="metric-value">{avgWait}<span>menit</span></p></Card>
    </div>
    <div className="kg-layout">
      <Card><SectionTitle title={kind === "penerimaan" ? "Lab test penerimaan RT" : "QC barang jadi"} subtitle="Pilih baris untuk melihat parameter dan batasnya." action={<Toggle label="Jenis uji" value={kind} onChange={k => { setKind(k); setOpenId(null); }} options={[{ value: "penerimaan", label: "Penerimaan RT" }, { value: "qc-fg", label: "QC barang jadi" }]} />} />
        <div className="table-wrap"><table className="select-table"><thead><tr><th>Sampel</th><th>{kind === "penerimaan" ? "RT" : "Lot"}</th><th>Diambil</th><th>Status</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className={openId === r.id ? "selected" : ""}><td><button className="row-button" aria-pressed={openId === r.id} onClick={() => setOpenId(r.id)}><strong className="mono">{r.id}</strong></button></td><td data-label={kind === "penerimaan" ? "RT" : "Lot"}><strong className="mono">{r.subject}</strong><span className="table-sub">{r.detail}</span></td><td data-label="Diambil">{r.sampled}</td><td data-label="Status"><Badge tone={badge(r).tone}>{badge(r).label}</Badge></td></tr>)}</tbody></table></div>
      </Card>
      <aside className="kg-detail" aria-live="polite">{open ? <>
        <div className="kg-detail-top"><Badge tone={badge(open).tone}>{badge(open).label}</Badge><SourceButton id={open.source} onSelect={setSource} compact /></div>
        <h2><span className="mono">{open.subject}</span></h2>
        <p className="small muted">{open.id} · {open.detail} · diambil {open.sampled}</p>
        <ul className="param-list">{open.params.map(p => <li key={p.name}><Icon icon={p.ok === null ? CircleDashed : p.ok ? CircleCheck : CircleX} size={16} className={p.ok === null ? "muted" : p.ok ? "ok-text" : "crit-text"} /><span><strong>{p.name}</strong><small>Batas {p.limit}</small></span><span className="mono">{p.value}</span></li>)}</ul>
        {open.decision || demo.labs[open.id] ? <p className="small"><strong>{decided((open.decision || demo.labs[open.id])!).label}</strong> oleh {(open.decision || demo.labs[open.id])!.by}, {(open.decision || demo.labs[open.id])!.at}. {(open.decision || demo.labs[open.id])!.note}</p>
          : decidable(open) ? <><div className="page-actions"><button className="button secondary" disabled={!allowed || submitting} onClick={() => { setNote(""); setSubmitError(null); setDialog("ditolak"); }}><Icon icon={X} size={16} />Tolak RT</button><button className="button primary" disabled={!allowed || open.status === "uji-ulang" || submitting} onClick={() => { setNote(""); setSubmitError(null); setDialog("dirilis"); }}><Icon icon={Check} size={16} />Rilis ke receiving</button></div>{open.status === "uji-ulang" && <p className="small muted">Rilis menunggu hasil uji ulang alcohol test, perkiraan {open.eta || "15.30"}. Penolakan tetap bisa dilakukan.</p>}<RoleNote permission="lab.decide" /></>
          : open.status === "positif" ? <Link className="button primary" href="/trace">Telusuri lot ini<Icon icon={ArrowRight} size={16} /></Link>
          : <p className="small muted">{open.status === "dalam-uji" ? "Uji masih berjalan. Keputusan QA tersedia setelah semua parameter selesai." : "Sudah dirilis sebelum snapshot 14.42."}</p>}
      </> : <><p className="small with-icon"><Icon icon={FlaskConical} size={14} />Pilih sampel untuk melihat parameternya.</p><p className="small muted">QA/Lab merilis RT ke antrean bongkar atau menolaknya. Penolakan wajib disertai alasan dan tercatat di Riwayat Persetujuan.</p></>}</aside>
    </div>
    {dialog && open && <Modal title={dialog === "dirilis" ? `Rilis ${open.subject} ke receiving?` : `Tolak ${open.subject}?`} onClose={() => { setDialog(null); setSubmitError(null); }}><form onSubmit={submit}><Badge>Data simulasi</Badge><p className="dialog-summary">{dialog === "dirilis" ? `${open.subject} masuk antrean bongkar. Semua parameter dalam batas.` : `${open.subject} tidak dibongkar dan dikembalikan ke pemasok. Alasan diperlukan agar keputusan dapat ditelusuri.`}</p>{submitError && <p className="crit-text small">{submitError}</p>}<label className="field-label" htmlFor="lab-note">Catatan {dialog === "ditolak" ? "(wajib)" : "(opsional)"}</label><textarea id="lab-note" value={note} onChange={e => setNote(e.target.value)} required={dialog === "ditolak"} maxLength={500} placeholder={dialog === "ditolak" ? "Contoh: alcohol test positif pada uji ulang." : "Contoh: prioritaskan bongkar karena umur susu 7j 20m."} /><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => { setDialog(null); setSubmitError(null); }} disabled={submitting}>Batal</button><button className="button primary" disabled={submitting || (dialog === "ditolak" && !note.trim())}>{submitting ? "Memproses…" : (dialog === "dirilis" ? "Konfirmasi rilis" : "Konfirmasi penolakan")}<Icon icon={Check} size={16} /></button></div></form></Modal>}
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
