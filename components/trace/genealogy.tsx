"use client";

import { Link2, Printer } from "lucide-react";
import { scenario } from "@/lib/data";
import { number } from "@/lib/format";
import type { Hold } from "@/lib/demo";
import { lotLocation } from "@/mock/ops";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { Badge, Icon, Modal, SourceButton } from "@/components/ui";

interface GenealogyData {
  hold: Hold;
  handoffs: typeof scenario.handoffs;
  labTests: { id: string; subject: string; result: string }[];
  lots: (Hold["lots"][number] & { place: string; shipped: boolean })[];
}

/** Rantai serah-terima batch dari farm sampai lot. Langkah `gap` adalah celah visibilitas yang dulu hanya ada di catatan operator. */
export function HandoffChain({ onSource, handoffs }: { onSource: (id: string) => void; handoffs?: typeof scenario.handoffs }) {
  const items = handoffs ?? scenario.handoffs;
  return <ol className="handoff-chain">{items.map(h => <li key={h.step} className={h.gap ? "gap" : ""}>
    <span className="handoff-dot" aria-hidden="true">{h.gap && <Icon icon={Link2} size={12} />}</span>
    <div>
      <div className="audit-top"><strong>{h.step}</strong><span className="mono small">{h.batch}</span></div>
      <p className="small">{h.from} ke {h.to} · {h.kind} · {h.volume}</p>
      <p className="small muted">{h.window} · dicatat dari {h.record}</p>
      {h.gap && <Badge tone="ok">Celah serah-terima terhubung</Badge>}
      <SourceButton id={h.source} onSelect={onSource} compact />
    </div>
  </li>)}</ol>;
}

/** Status tiap lot: masih di gudang cukup hold, sudah dikirim perlu recall. */
export const lotAction = (id: string) => lotLocation[id] ?? { place: "Lokasi belum tercatat di ERP", shipped: false };

/** Laporan genealogi kualitas untuk satu pengajuan hold: sumber, rantai batch, lot, dan uji lab terkait. */
export function GenealogyReport({ hold, onClose }: { hold: Hold; onClose: () => void }) {
  const genRes = useResource<GenealogyData>(API_MODE ? `/holds/${hold.id}/genealogy` : null);

  if (API_MODE && !genRes.data) {
    if (genRes.error) {
      return (
        <Modal title={`Genealogi ${hold.id}`} onClose={onClose} className="report-modal">
          <p className="crit-text">Gagal memuat genealogi: {genRes.error.message}</p>
        </Modal>
      );
    }
    return (
      <Modal title={`Genealogi ${hold.id}`} onClose={onClose} className="report-modal">
        <p className="muted">Memuat genealogi…</p>
      </Modal>
    );
  }

  const data = API_MODE ? genRes.data! : null;
  const lots = data ? data.lots : hold.lots.map(l => ({ ...l, ...lotAction(l.id) }));
  const packs = lots.reduce((sum, l) => sum + l.packs, 0);
  const recall = lots.filter(l => l.shipped);
  const current = API_MODE ? (data?.handoffs && data.handoffs.length > 0) : hold.trigger === scenario.qcEvent.lot;
  const handoffs = data ? data.handoffs : scenario.handoffs;
  const labTests = data ? data.labTests : [
    { id: "LAB-4471", subject: "RT-04 penerimaan", result: "Lolos, mendekati batas" },
    { id: scenario.qcEvent.source, subject: scenario.qcEvent.lot, result: scenario.qcEvent.result },
  ];

  return <Modal title={`Genealogi ${hold.id}`} onClose={onClose} className="report-modal">
    <Badge>Data simulasi</Badge>
    <p className="dialog-summary">Pemicu {hold.trigger}, sumber kandidat {hold.rt}. {lots.length} lot, {number(packs)} pak: {lots.length - recall.length} hold di gudang, {recall.length} recall dari distribusi.</p>
    {current ? <>
      <h3 className="report-title">Rantai batch</h3>
      <HandoffChain onSource={() => {}} handoffs={handoffs} />
      <h3 className="report-title">Uji lab terkait</h3>
      <ul className="hold-list">{labTests.map(t => <li key={t.id}><span className="mono">{t.id}</span><span>{t.subject}</span><span>{t.result}</span></li>)}</ul>
    </> : <p className="small muted">Rantai batch untuk pengajuan sebelum demo tidak dimuat di mockup.</p>}
    <h3 className="report-title">Lot</h3>
    <ul className="hold-list">{lots.map(l => <li key={l.id}><span className="mono">{l.id}</span><span>{l.percent}% {hold.rt} · {number(l.packs)} pak</span><span className={l.shipped ? "crit-text" : ""}>{l.shipped ? "Recall: " : "Hold: "}{l.place}</span></li>)}</ul>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={() => window.print()}><Icon icon={Printer} size={16} />Cetak</button><button type="button" className="button primary" onClick={onClose}>Selesai</button></div>
  </Modal>;
}
