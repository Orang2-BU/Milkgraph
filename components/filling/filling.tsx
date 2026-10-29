"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Factory, Flame, Gauge, TriangleAlert } from "lucide-react";
import { scenario } from "@/lib/data";
import { number, time } from "@/lib/format";
import { useDemo } from "@/lib/demo";
import { starvation } from "@/lib/rules";
import { asepticTanks, changeoverMatrix, fillers, UNIT_STATE } from "@/mock/ops";
import { Instructions } from "@/components/tangki/tangki";
import { Badge, Card, Icon, PageHeading, SectionTitle, SourceButton, SourceModal, Timeline } from "@/components/ui";

const plan = scenario.plans[0];
const NOW = 102;
const filler = (id: string) => fillers.find(f => f.id === id)!;

export function Filling() {
  const demo = useDemo();
  const [source, setSource] = useState<string | null>(null);
  const approved = demo.decisions.some(d => d.plan === plan.id && d.status === "approved");
  const view = approved ? "after" : "before";
  const breakdown = fillers.filter(f => f.state === "breakdown");

  return <div className="page-enter">
    <PageHeading title="Lini Filling" subtitle="Lima lini sterilisasi, lima aseptic tank, dan sepuluh mesin filling. Setiap aseptic tank melayani dua mesin filling."><Badge>{approved ? "Mengikuti rekomendasi disetujui" : "Mengikuti rencana awal (FIFO)"}</Badge></PageHeading>
    <Instructions role="supervisor" />
    <div className="split-even page-block">{asepticTanks.filter(t => t.planned).map(tank => {
      const lines = tank.fillers.map(filler);
      const need = lines.reduce((sum, f) => sum + f.litres, 0);
      const net = tank.inflow[view] - need;
      const emptyAt = net < 0 ? NOW + Math.round(tank.level / -net * 60) : null;
      const pct = Math.round(tank.level / tank.capacity * 100);
      const short = emptyAt !== null && emptyAt < 420;
      const running = lines.filter(f => f.state === "jalan");
      return <Card key={tank.id} className="line-card">
        <SectionTitle title={`${tank.id} · ${tank.product}`} subtitle={`Dari ${tank.sterilizer}, melayani ${lines.map(f => f.id).join(" dan ")}`} action={<Badge tone={short ? "crit" : "ok"}>{short ? `Kosong ${time(emptyAt!)}` : "Pasokan aman"}</Badge>} />
        <div className="tank-card">
          <div className="tank-top"><span className="tank-id"><Icon icon={Factory} size={18} /><span className="mono">{tank.id}</span></span><span className="small muted">{number(tank.level)} / {number(tank.capacity)} L · {pct}%</span></div>
          <div className={`capacity-bar ${short ? "crit" : pct < 25 ? "warn" : "ok"}`} role="meter" aria-label={`${tank.id} terisi ${pct}%`} aria-valuenow={tank.level} aria-valuemin={0} aria-valuemax={tank.capacity}><span style={{ width: `${Math.max(pct, 2)}%` }} /></div>
          <dl className="fact-list"><div><dt>Masuk dari {tank.sterilizer}</dt><dd>{number(tank.inflow[view])} L/jam</dd></div><div><dt>Dipakai {running.map(f => f.id).join(" + ")}</dt><dd>{number(need)} L/jam</dd></div><div><dt>Selisih</dt><dd className={net < 0 ? "crit-text" : ""}>{net > 0 ? "+" : ""}{number(net)} L/jam</dd></div><div><dt>Kosong</dt><dd>{emptyAt === null ? "Level naik" : short ? time(emptyAt) : "Setelah shift"}</dd></div></dl>
        </div>
        <ul className="filler-list">{lines.map(f => <li key={f.id}>
          <span><strong>{f.id}</strong><small>{f.product} · {f.pack}</small></span>
          {f.state === "jalan" ? <span className="filler-speed"><span className="metric-label"><Icon icon={Gauge} size={13} />{number(f.speed)} / {number(f.target)} pak/menit</span><span className="capacity-bar ok" role="meter" aria-label={`Kecepatan ${f.id}`} aria-valuenow={f.speed} aria-valuemin={0} aria-valuemax={f.target}><span style={{ width: `${f.speed / f.target * 100}%` }} /></span></span> : <small className="muted">{f.note}</small>}
          <span className="numeric small">{number(f.output)} pak<br /><span className="muted">sejak 14.00</span></span>
        </li>)}</ul>
        {lines.length > 1 && running.length > 1 && <p className="small muted with-icon"><Icon icon={TriangleAlert} size={14} />Satu tangki untuk dua lini: bila {tank.id} kosong, {running.map(f => f.id).join(" dan ")} berhenti bersamaan.</p>}
        <SourceButton id={tank.id === "AT-2" ? "FLOW-F2" : "FILL-F1"} onSelect={setSource} />
      </Card>;
    })}</div>
    <Card className="page-block"><SectionTitle title="Konfigurasi sterilisasi, aseptic, dan filling" subtitle="Status setiap unit pada snapshot 14.42. Aset hilir dipakai bersama, jadi gangguan di satu titik menjalar ke dua lini." action={breakdown.length ? <Badge tone="crit">{breakdown.length} breakdown</Badge> : undefined} />
      <div className="config-grid">{asepticTanks.map(tank => <div key={tank.id} className={`config-row ${tank.planned ? "planned" : ""}`}>
        <span className="config-unit"><Icon icon={Flame} size={15} /><span><strong>{tank.sterilizer}</strong><Badge tone={UNIT_STATE[tank.sterilizerState].tone}>{UNIT_STATE[tank.sterilizerState].label}</Badge></span></span>
        <ArrowRight size={14} aria-hidden className="muted" />
        <span className="config-unit"><Icon icon={Factory} size={15} /><span><strong>{tank.id}</strong><small>{tank.level ? `${Math.round(tank.level / tank.capacity * 100)}%` : "Kosong"} · {tank.product}</small></span></span>
        <ArrowRight size={14} aria-hidden className="muted" />
        <span className="config-fillers">{tank.fillers.map(filler).map(f => <span key={f.id} className="config-unit" title={f.note}><span><strong>{f.id}</strong><Badge tone={UNIT_STATE[f.state].tone}>{UNIT_STATE[f.state].label}</Badge></span><small>{f.pack}</small></span>)}</span>
      </div>)}</div>
      <p className="small muted">Baris bertanda hijau masuk rencana shift ini (F1, F2, F4). {breakdown.map(f => `${f.id}: ${f.note}.`).join(" ")}</p>
    </Card>
    <Card className="gantt-card"><SectionTitle title="Jadwal filling" subtitle={approved ? "Rekomendasi disetujui: F2 dan F4 tetap berjalan." : "Rencana awal: AT-2 kosong 15.50, F2 dan F4 berhenti bersamaan."} action={<span className={`recommendation-saving light ${starvation(plan[view]) ? "crit-text" : ""}`}><Icon icon={TriangleAlert} size={15} />Starvation {starvation(plan[view])} menit</span>} /><Timeline blocks={plan[view]} resources={["Filling F1", "Filling F2", "Filling F4"]} onSource={setSource} /><p className="small muted">Rencana awal {starvation(plan.before)} menit per lini, rekomendasi {starvation(plan.after)} menit. <Link className="inline-link" href="/rencana">Buka Rencana & What-if</Link></p></Card>
    <Card><SectionTitle title="Matriks changeover (SOP)" subtitle="Waktu minimum ganti produk dalam menit [asumsi]. Changeover yang lebih pendek dari matriks melanggar constraint SOP." action={<Link className="text-link" href="/constraint">Batas changeover<Icon icon={ArrowRight} size={14} /></Link>} /><div className="table-wrap"><table className="matrix-table"><thead><tr><th>Dari \ ke</th>{changeoverMatrix.products.map(p => <th key={p} className="numeric">{p}</th>)}</tr></thead><tbody>{changeoverMatrix.products.map((from, i) => <tr key={from}><td><strong>{from}</strong></td>{changeoverMatrix.minutes[i].map((m, j) => <td key={j} data-label={changeoverMatrix.products[j]} className="numeric">{m ? `${m} mnt` : "-"}</td>)}</tr>)}</tbody></table></div><p className="small muted">{changeoverMatrix.note}</p><button className="text-link" onClick={() => setSource("FILL-F1")}>Lihat jadwal F1<Icon icon={ArrowUpRight} size={14} /></button></Card>
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
