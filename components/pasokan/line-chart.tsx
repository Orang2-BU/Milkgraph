"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

type Point = { month: string; value: number };

/** Angka sumbu yang bulat: langkah 1, 2, 2,5, atau 5 kali pangkat sepuluh, sekitar 4 garis. */
function niceTicks(min: number, max: number) {
  const raw = (max - min) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw)!;
  const start = Math.floor(min / step) * step;
  return Array.from({ length: Math.ceil((max - start) / step) + 1 }, (_, i) => +(start + i * step).toFixed(6));
}

/** Grafik tren satu seri (Recharts): area hijau, grid horizontal, tooltip kaca, garis referensi opsional, plus tampilan tabel. */
export function LineChart({ label, values, labels, unit, decimals = 0, reference }: { label: string; values: number[]; labels: string[]; unit: string; decimals?: number; reference?: { value: number; label: string } }) {
  const fmt = (v: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(v);
  const data: Point[] = values.map((value, i) => ({ month: labels[i], value }));
  const id = `fill-${label.replace(/\W+/g, "-")}`;
  const all = [...values, ...(reference ? [reference.value] : [])];
  const ticks = niceTicks(Math.min(...all) * 0.97, Math.max(...all) * 1.02);
  const axis = (v: number) => new Intl.NumberFormat("id-ID").format(v);

  function Tip({ active, payload }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as Point;
    return <div className="lc-tooltip"><span>{p.month}</span><strong>{fmt(p.value)} {unit}</strong>{reference && <span>{p.value >= reference.value ? "Di atas" : "Di bawah"} kapasitas ({fmt(Math.abs(p.value - reference.value))})</span>}</div>;
  }

  return <figure className="line-chart" aria-label={`${label}: ${labels[0]} ${fmt(values[0])} sampai ${labels.at(-1)} ${fmt(values.at(-1)!)} ${unit}`}>
    <div className="line-chart-plot">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
          <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.8} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} tick={{ fontSize: 11, fill: "var(--color-on-surface-muted)" }} />
          <YAxis domain={[ticks[0], ticks.at(-1)!]} ticks={ticks} tickLine={false} axisLine={false} width={44} tickFormatter={axis} tick={{ fontSize: 11, fill: "var(--color-on-surface-muted)" }} />
          <Tooltip content={Tip} cursor={{ stroke: "var(--color-on-surface-muted)", strokeDasharray: "3 3" }} />
          {reference && <ReferenceLine y={reference.value} stroke="var(--color-status-crit)" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: reference.label, position: "insideTopLeft", fontSize: 11, fill: "var(--color-on-surface)" }} />}
          <Area type="monotone" dataKey="value" name={label} stroke="var(--color-primary)" strokeWidth={2} fill={`url(#${id})`} dot={false} activeDot={{ r: 5, fill: "var(--color-primary)", stroke: "var(--color-surface)", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <details className="lc-table"><summary>Lihat data sebagai tabel</summary><div className="table-wrap"><table><thead><tr><th>Bulan</th><th className="numeric">{unit}</th></tr></thead><tbody>{data.map(d => <tr key={d.month}><td>{d.month}</td><td className="numeric">{fmt(d.value)}</td></tr>)}</tbody></table></div></details>
  </figure>;
}
