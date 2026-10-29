"use client";

import { Link2, Printer } from "lucide-react";
import { scenario } from "@/lib/data";
import { number } from "@/lib/format";
import type { Hold } from "@/lib/demo";
import { lotLocation } from "@/mock/ops";
import { Badge, Icon, Modal, SourceButton } from "@/components/ui";

/** Rantai serah-terima batch dari farm sampai lot. Langkah `gap` adalah celah visibilitas yang dulu hanya ada di catatan operator. */
export function HandoffChain({ onSource }: { onSource: (id: string) => void }) {
  return <ol className="handoff-chain">{scenario.handoffs.map(h => <li key={h.step} className={h.gap ? "gap" : ""}>
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
  const packs = hold.lots.reduce((sum, l) => sum + l.packs, 0);
  const recall = hold.lots.filter(l => lotAction(l.id).shipped);
  const current = hold.trigger === scenario.qcEvent.lot;
  return <Modal title={`Genealogi ${hold.id}`} onClose={onClose} className="report-modal">
    <Badge>Data simulasi</Badge>
    <p className="dialog-summary">Pemicu {hold.trigger}, sumber kandidat {hold.rt}. {hold.lots.length} lot, {number(packs)} pak: {hold.lots.length - recall.length} hold di gudang, {recall.length} recall dari distribusi.</p>
    {current ? <>
      <h3 className="report-title">Rantai batch</h3>
      <HandoffChain onSource={() => {}} />
      <h3 className="report-title">Uji lab terkait</h3>
      <ul className="hold-list"><li><span className="mono">LAB-4471</span><span>RT-04 penerimaan</span><span>Lolos, mendekati batas</span></li><li><span className="mono">{scenario.qcEvent.source}</span><span>{scenario.qcEvent.lot}</span><span>{scenario.qcEvent.result}</span></li></ul>
    </> : <p className="small muted">Rantai batch untuk pengajuan sebelum demo tidak dimuat di mockup.</p>}
    <h3 className="report-title">Lot</h3>
    <ul className="hold-list">{hold.lots.map(l => { const at = lotAction(l.id); return <li key={l.id}><span className="mono">{l.id}</span><span>{l.percent}% {hold.rt} · {number(l.packs)} pak</span><span className={at.shipped ? "crit-text" : ""}>{at.shipped ? "Recall: " : "Hold: "}{at.place}</span></li>; })}</ul>
    <div className="dialog-actions"><button type="button" className="button secondary" onClick={() => window.print()}><Icon icon={Printer} size={16} />Cetak</button><button type="button" className="button primary" onClick={onClose}>Selesai</button></div>
  </Modal>;
}
