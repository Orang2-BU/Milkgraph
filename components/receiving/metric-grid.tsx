import { ArrowDownRight, ArrowUpRight, Clock3, FlaskConical, Minus, Truck, Warehouse } from "lucide-react";
import { scenario } from "@/lib/data";
import { Card, Icon } from "@/components/ui";

import type { Scenario } from "@/mock/types";

const metricIcons = [Truck, Clock3, FlaskConical, Warehouse];

/** Arah grafik dari titik awal ke titik akhir. Revisi 8 Nov poin 1: hijau saat naik, merah saat turun. */
export function trendDirection(trend: number[]): "naik" | "turun" | "datar" {
  const first = trend[0], last = trend[trend.length - 1];
  if (first === undefined || last === undefined || first === last) return "datar";
  return last > first ? "naik" : "turun";
}
const DIRECTION = {
  naik: { icon: ArrowUpRight, className: "trend-up" },
  turun: { icon: ArrowDownRight, className: "trend-down" },
  datar: { icon: Minus, className: "trend-flat" },
};

/** Empat KPI receiving dengan sparkline tren [simulasi]; dipakai di Beranda dan Receiving. */
export function MetricGrid({ metrics = scenario.metrics, onSource }: { metrics?: Scenario["metrics"]; onSource: (id: string) => void }) {
  const items = metrics ?? scenario.metrics;
  return <div className="metrics-grid">{items.map((metric, i) => {
    const min = Math.min(...metric.trend) - 1;
    const range = Math.max(...metric.trend) - min || 1;
    const points = metric.trend.map((v, j) => `${j * 10},${36 - (v - min) / range * 29}`).join(" ");
    const direction = trendDirection(metric.trend);
    const dir = DIRECTION[direction];
    return <Card className={`metric-card ${dir.className}`} key={metric.label}><div className="metric-label"><span className="metric-icon"><Icon icon={metricIcons[i]} /></span><span>{metric.label}</span><button className="metric-source icon-button" aria-label={`Lihat sumber ${metric.label}`} onClick={() => onSource(metric.source)}><Icon icon={ArrowUpRight} size={16} /></button></div><div className="metric-bottom"><div><p className="metric-value">{metric.value}<span>{metric.unit}</span></p><p className="metric-delta"><Icon icon={dir.icon} size={13} />{metric.delta}</p></div><svg className="sparkline" viewBox="0 0 110 42" role="img" aria-label={`Tren simulasi ${metric.label}, ${direction}: ${metric.trend.join(", ")}`}><polygon points={`0,42 ${points} 110,42`} /><polyline points={points} /></svg></div></Card>;
  })}</div>;
}
