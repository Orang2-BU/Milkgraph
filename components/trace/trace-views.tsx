"use client";

import { Check } from "lucide-react";
import { scenario } from "@/lib/data";
import { number } from "@/lib/format";
import type { Answer } from "@/mock/types";
import { Badge, Icon, SourceButton } from "@/components/ui";
import { Equipment, KIND_LABEL } from "./equipment";
import { HandoffChain, lotAction } from "./genealogy";

const backward = scenario.answers.find(a => a.id === "backward")!;
const forward = scenario.answers.find(a => a.id === "forward")!;
const nodeById = (id: string) => scenario.graph.nodes.find(n => n.id === id);
/** Volume pertama dalam liter dari teks seperti "FILLED_INTO 8.800 L" atau "8.800 L dari 39.200 L" (ambil yang terakhir bila `last`). */
const liters = (text: string, last = false) => { const all = [...text.matchAll(/([\d.]+) L/g)].map(m => Number(m[1].replace(/\./g, ""))); return all.length ? all[last ? all.length - 1 : 0] : null; };

/** Baris detail untuk satu node. Hanya field yang ada di data skenario; tidak ada nilai karangan. */
function detailRows(id: string): [string, string][] {
  const node = nodeById(id)!;
  const rows: [string, string][] = [];
  if (node.type === "RT") {
    const farm = scenario.graph.edges.find(e => e.target === id && e.label === "COLLECTED");
    if (farm) rows.push(["Asal", nodeById(farm.source)!.label]);
    const fill = scenario.graph.edges.find(e => e.source === id && e.label.startsWith("FILLED_INTO"));
    const tanker = scenario.tankers.find(t => t.id === node.label);
    const volume = fill ? liters(fill.label) : tanker?.volume;
    if (volume) rows.push(["Volume", `${number(volume)} L`]);
    if (tanker) rows.push(["Suhu", `${tanker.temperature} °C`], ["Umur susu", tanker.age], ["Tahap", tanker.stage]);
    const mix = backward.mix?.find(m => m.id === node.label);
    if (mix) rows.push([`Porsi di ${scenario.qcEvent.lot}`, `${mix.percent}%`]);
  }
  if (node.type === "Lot") {
    const lot = forward.lots?.find(l => l.id === node.label);
    if (lot) { const at = lotAction(lot.id); rows.push(["Produk", lot.product], ["Isi RT-04", `${lot.percent}%`], ["Jumlah", `${number(lot.packs)} pak`], [at.shipped ? "Recall" : "Hold di", at.place]); }
    if (node.label === scenario.qcEvent.lot) rows.push(["Hasil QC", scenario.qcEvent.result]);
  }
  const handoff = scenario.handoffs.find(h => h.to.split(/, | \+ /).includes(node.label)) ?? scenario.handoffs.find(h => h.from.split(/, | \+ /).includes(node.label));
  if (handoff && node.type !== "RT" && node.type !== "Lot") rows.push(["Batch", handoff.batch], ["Volume", handoff.volume], ["Waktu", handoff.window]);
  return rows;
}

export function NodeDetail({ id, onSource }: { id: string | null; onSource: (id: string) => void }) {
  if (!id) return <div className="node-detail empty"><p className="small muted">Klik alat di graph untuk melihat detailnya.</p></div>;
  const node = nodeById(id)!;
  const source = scenario.sources.find(s => s.id === node.source);
  return <section className="node-detail" aria-label={`Detail ${node.label}`} aria-live="polite">
    <div className="node-detail-head"><Equipment kind={node.type} size={64} /><div><strong className="mono">{node.label}</strong><span>{KIND_LABEL[node.type] ?? node.type}</span></div></div>
    <dl className="node-detail-rows">{detailRows(id).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}{source && <div><dt>Tercatat</dt><dd>{source.title} · {source.time}</dd></div>}</dl>
    {source && <SourceButton id={source.id} onSelect={onSource} compact />}
  </section>;
}

/** Tab Tabel: proporsi RT (trace mundur) atau lot terdampak (trace maju), lalu rantai serah-terima batch. */
export function TraceTable({ answer, onSource, onHighlight }: { answer: Answer; onSource: (id: string) => void; onHighlight: (id: string | null) => void }) {
  const packs = answer.lots?.reduce((sum, lot) => sum + lot.packs, 0) ?? 0;
  return <div className="trace-table">
    {answer.mix && <div className="table-wrap"><table><thead><tr><th>RT</th><th>Asal</th><th className="numeric">Volume ke RMT-2</th><th className="numeric">Porsi di {scenario.qcEvent.lot}</th></tr></thead><tbody>{answer.mix.map(m => { const id = m.id.toLowerCase(); const farm = scenario.graph.edges.find(e => e.target === id && e.label === "COLLECTED"); const fill = scenario.graph.edges.find(e => e.source === id && e.label.startsWith("FILLED_INTO")); return <tr key={m.id} className={m.id === "RT-04" ? "suspect-row" : ""} onMouseEnter={() => onHighlight(id)} onMouseLeave={() => onHighlight(null)}><td><strong className="mono">{m.id}</strong></td><td data-label="Asal">{farm ? nodeById(farm.source)!.label : "Tidak tercatat"}</td><td data-label="Volume" className="numeric">{fill ? `${number(liters(fill.label)!)} L` : "-"}</td><td data-label="Porsi" className="numeric">{m.percent}%</td></tr>; })}</tbody></table></div>}
    {answer.lots && <div className="lot-results"><table><thead><tr><th>Lot</th><th className="numeric">Isi RT-04</th><th className="numeric">Pak</th><th>Tindakan</th></tr></thead><tbody>{answer.lots.map(lot => { const at = lotAction(lot.id); return <tr key={lot.id}><td><strong className="mono">{lot.id}</strong><span className="table-sub">{lot.product}</span></td><td data-label="Isi RT-04" className="numeric">{lot.percent}%</td><td data-label="Pak" className="numeric">{number(lot.packs)}</td><td data-label="Tindakan" className={at.shipped ? "crit-text" : ""}>{at.shipped ? "Recall" : "Hold"}</td></tr>; })}</tbody></table><p className="hold-compare"><Icon icon={Check} size={15} /><span>Hold <strong>{answer.lots.length} lot · {number(packs)} pak</strong>, dibanding {scenario.holdBaseline.lots} lot · {number(scenario.holdBaseline.packs)} pak tanpa genealogi volume [simulasi].</span></p></div>}
    <h3 className="factors-title">Rantai serah-terima batch</h3>
    <HandoffChain onSource={onSource} />
  </div>;
}

/** Catatan selisih yang bisa dijelaskan dari relasi graph (krim keluar di separator, premix masuk di mixing). */
const DELTA_NOTE: Record<string, string> = { "Storage / transfer tank": "termasuk krim ke CT-1", Mixing: "termasuk premix PM-3" };
/** Tab Mass Balance: volume batch di tiap tahap dari catatan serah-terima, dan selisih terhadap tahap sebelumnya. */
export function MassBalance({ onSource }: { onSource: (id: string) => void }) {
  const steps = scenario.handoffs.slice(1).map(h => ({ ...h, liters: liters(h.volume, true) }));
  const max = Math.max(...steps.map(s => s.liters ?? 0));
  return <div className="mass-balance">
    <div className="mass-head"><p className="small muted">Volume batch {steps[0].batch} per tahap, dari catatan serah-terima.</p><Badge>Data simulasi</Badge></div>
    <ol className="mass-rows">{steps.map((s, i) => {
      const prev = steps.slice(0, i).reverse().find(p => p.liters)?.liters;
      const delta = s.liters && prev ? s.liters - prev : null;
      return <li key={s.step}>
        <div className="mass-label"><strong>{s.step}</strong><span className="mono small">{s.to}</span></div>
        <div className="mass-bar">{s.liters ? <span style={{ width: `${s.liters / max * 100}%` }} /> : null}</div>
        <div className="mass-value"><strong>{s.liters ? `${number(s.liters)} L` : s.volume}</strong>{delta !== null && <span className={delta < 0 ? (DELTA_NOTE[s.step] ? "muted" : "warn-text") : "muted"}>{delta > 0 ? "+" : ""}{number(delta)} L{DELTA_NOTE[s.step] ? `, ${DELTA_NOTE[s.step]}` : delta < 0 ? ", belum ada catatan penyebab" : ""}</span>}{!s.liters && <span className="muted">satuan pak, tidak dibandingkan</span>}</div>
        <SourceButton id={s.source} onSelect={onSource} compact />
      </li>;
    })}</ol>
  </div>;
}
