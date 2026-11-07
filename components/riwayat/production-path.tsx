"use client";

import { ArrowRight, Clock3, Link2 } from "lucide-react";
import { Card, Icon, SectionTitle } from "@/components/ui";
import { Equipment } from "@/components/trace/equipment";
import type { Output } from "@/mock/outputs";
import { buildSteps, durationText } from "./timeline";

const KIND: Record<string, string> = {
  "Farm ke RT": "Farm", Receiving: "Buffer", "Pre-processing": "Thermal", "Storage / transfer tank": "Storage",
  Mixing: "Mixing", "Sterilisasi dan aseptic": "Sterilisasi", Filling: "Filling",
};
export const kindOf = (step: string) => KIND[step] ?? "Storage";

type Step = ReturnType<typeof buildSteps>[number];

/** Jalur produksi bertahap: jam dan durasi di kiri, kartu tahap di kanan, jeda antarcatatan di antaranya. */
export function ProductionPath({ output, active, onPick }: { output: Output; active: number; onPick: (i: number) => void }) {
  const steps = buildSteps(output.chain);
  return <Card className="rp-path">
    <SectionTitle title="Jalur produksi" subtitle="Ikuti dari sumber susu sampai hasil akhir. Pilih tahap untuk melihat detailnya." />
    <ol className="rp-steps">
      {steps.map((s: Step) => <li key={s.index}>
        {s.gapBefore > 0 && <p className="rp-gap"><Icon icon={Clock3} size={13} />Jeda antarcatatan {durationText(s.gapBefore)}</p>}
        {s.overlapsPrev && <p className="rp-gap">Rentang proses ini berjalan bersamaan dengan tahap sebelumnya.</p>}
        <div className="rp-step">
          <div className="rp-when">{s.window ? <><strong>{s.window.startText}-{s.window.endText}</strong><span>{durationText(s.duration)}</span></> : <span>Waktu belum tercatat</span>}</div>
          <span className="rp-dot" aria-hidden="true">{s.index + 1}</span>
          <button type="button" className={`rp-card ${active === s.index ? "is-active" : ""}`} aria-pressed={active === s.index} onClick={() => onPick(s.index)}>
            <Equipment kind={kindOf(s.step)} size={40} />
            <span className="rp-card-copy">
              <strong>{s.step}{s.gap && <span className="rp-flag"><Icon icon={Link2} size={12} />Celah tersambung</span>}</strong>
              <span>{s.from} <ArrowRight size={12} aria-hidden /> {s.to}</span>
              <small className="mono">{s.batch}</small>
            </span>
            <Icon icon={ArrowRight} size={16} />
          </button>
        </div>
      </li>)}
    </ol>
    <p className="rp-end"><span className="status-dot tone-ok" aria-hidden="true" /><strong className="mono">{output.id}</strong>{output.end ? `selesai ${output.end}` : "Jam selesai per lot belum tercatat"}</p>
  </Card>;
}
