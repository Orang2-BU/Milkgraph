import { ArrowDown, ArrowUpRight, Clock3, FlaskConical, Truck, Warehouse } from "lucide-react";
import { scenario } from "@/lib/data";
import { Card, Icon } from "@/components/ui";

import type { Scenario } from "@/mock/types";

const metricIcons = [Truck, Clock3, FlaskConical, Warehouse];
/** Empat KPI receiving dengan sparkline tren [simulasi]; dipakai di Beranda dan Receiving. */
export function MetricGrid({ metrics = scenario.metrics, onSource }: { metrics?: Scenario["metrics"]; onSource: (id: string) => void }) {
  const items = metrics ?? scenario.metrics;
  return <div className="metrics-grid">{items.map((metric, i) => {
    const min = Math.min(...metric.trend) - 1;
    const range = Math.max(...metric.trend) - min || 1;
    const points = metric.trend.map((v, j) => `${j * 10},${36 - (v - min) / range * 29}`).join(" ");
    return <Card className="metric-card" key={metric.label}><div className="metric-label"><span className="metric-icon"><Icon icon={metricIcons[i]} /></span><span>{metric.label}</span><button className="metric-source icon-button" aria-label={`Lihat sumber ${metric.label}`} onClick={() => onSource(metric.source)}><Icon icon={ArrowUpRight} size={16} /></button></div><div className="metric-bottom"><div><p className="metric-value">{metric.value}<span>{metric.unit}</span></p><p className={`metric-delta ${i > 0 && i < 3 ? "brand-text" : ""}`}><Icon icon={i > 0 && i < 3 ? ArrowUpRight : ArrowDown} size={13} />{metric.delta}</p></div><svg className="sparkline" viewBox="0 0 110 42" role="img" aria-label={`Tren simulasi ${metric.label}: ${metric.trend.join(", ")}`}><polygon points={`0,42 ${points} 110,42`} /><polyline points={points} /></svg></div></Card>;
  })}</div>;
}
