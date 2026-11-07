"use client";

import { ArrowUpRight } from "lucide-react";
import { Card, Icon, SectionTitle, SourceButton } from "@/components/ui";

/** Grafik tunggu lab test per jam. Dipindah dari Antrean Truk ke Tes Lab (poin 7: satu halaman satu topik). */
export function LabWaitChart({ history, avg, delta, onSource }: { history: { hour: string; minutes: number }[]; avg: number; delta: number; onSource: (id: string) => void }) {
  return <Card className="qc-chart">
    <SectionTitle
      title="Tunggu lab test"
      subtitle="Menit, rata-rata per jam."
      action={<button className="icon-button" aria-label="Lihat sumber grafik lab test" onClick={() => onSource("LAB-QUEUE")}><Icon icon={ArrowUpRight} /></button>}
    />
    <div className="chart-summary">
      <strong>{avg}<span>menit</span></strong>
      <span className="brand-text"><Icon icon={ArrowUpRight} size={15} />{delta} menit</span>
    </div>
    <div className="bar-chart" role="img" aria-label={`Tunggu lab test: ${history.map(h => `${h.hour} ${h.minutes}`).join(", ")} menit`}>
      <div className="chart-grid"><span>60</span><span>40</span><span>20</span><span>0</span></div>
      <div className="chart-bars">
        {history.map((hour, i) => (
          <div className="bar-column" key={hour.hour}>
            <div className={`chart-bar ${i === history.length - 1 ? "current" : ""}`} style={{ height: `${(hour.minutes / 60) * 100}%` }}>
              <span>{hour.minutes}</span>
            </div>
            <span className="bar-label">{hour.hour.slice(0, 2)}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="chart-legend">
      <span><i className="legend-square neutral" />Jam sebelumnya</span>
      <span><i className="legend-square accent" />Jam ini</span>
    </div>
    <SourceButton id="LAB-QUEUE" onSelect={onSource} compact />
  </Card>;
}
