"use client";

import { ArrowLeftRight, Factory, Milk, Send, Sprout, TrendingUp } from "lucide-react";
import { number } from "@/lib/format";
import { sendDemand, useDemo } from "@/lib/demo";
import { can } from "@/lib/roles";
import { demandPlan, farms, fillers, PROCESS_LOSS, trend } from "@/mock/ops";
import { Badge, Card, Icon, PageHeading, RoleNote, SectionTitle } from "@/components/ui";
import { LineChart } from "./line-chart";

/** Kapasitas 320 t/hari dalam liter (massa jenis susu ±1,03 kg/L). */
const CAPACITY_L = Math.round(320_000 / 1.03);
const product = (d: (typeof demandPlan)[number]) => d.packs * d.litresPerPack;
const milkNeed = (d: (typeof demandPlan)[number]) => Math.round(product(d) * d.milk);
const needTotal = Math.round(demandPlan.reduce((sum, d) => sum + milkNeed(d), 0) / (1 - PROCESS_LOSS));
const supplyTotal = farms.reduce((sum, f) => sum + f.plannedL, 0);
const rtTotal = farms.reduce((sum, f) => sum + f.plannedRt, 0);
const running = fillers.filter(f => f.state === "jalan").length;

export function Pasokan() {
  const demo = useDemo();
  const allowed = can(demo.role, "demand.send");
  const sent = demo.log.find(e => e.title === "Kebutuhan susu dikirim ke farm");
  const gap = supplyTotal - needTotal;

  return <div className="page-enter">
    <PageHeading title="Pasokan & Permintaan" subtitle="Rencana kirim farm, kebutuhan susu dari rencana produksi, dan kapasitas pabrik dalam satu tempat untuk PPIC.">
      <button className="button primary" disabled={!allowed || !!sent} onClick={() => sendDemand(`${number(needTotal)} L untuk ${demandPlan.length} SKU, ${rtTotal} RT dari ${farms.length} farm`)}><Icon icon={Send} size={16} />{sent ? `Terkirim ${sent.at}` : "Kirim kebutuhan ke farm"}</button>
    </PageHeading>
    <RoleNote permission="demand.send" />
    <section className="dept-flow" aria-label="Alur antar-departemen">
      <div className="dept"><span className="dept-icon"><Icon icon={Sprout} size={18} /></span><strong>Farms</strong><small>Pasokan susu, jadwal kirim, kesiapan mutu</small></div>
      <div className="dept-links"><span><Icon icon={ArrowLeftRight} size={13} />Rencana kirim: {rtTotal} RT, {number(supplyTotal)} L</span><span><Icon icon={ArrowLeftRight} size={13} />Kebutuhan: {number(needTotal)} L{sent ? ", terkirim" : ", belum dikirim"}</span></div>
      <div className="dept"><span className="dept-icon"><Icon icon={Milk} size={18} /></span><strong>PPIC</strong><small>Terjemahkan demand, rencana dan alokasi, seimbangkan jadwal</small></div>
      <div className="dept-links"><span><Icon icon={ArrowLeftRight} size={13} />Rencana produksi: {demandPlan.length} SKU</span><span><Icon icon={ArrowLeftRight} size={13} />Kapasitas: {Math.round(needTotal / CAPACITY_L * 100)}%, {running} filler jalan</span></div>
      <div className="dept"><span className="dept-icon"><Icon icon={Factory} size={18} /></span><strong>Produksi</strong><small>Receiving dan proses, kendali eksekusi, output</small></div>
    </section>
    <div className="split-even">
      <Card><SectionTitle title="Permintaan produksi" subtitle="Juta pak per bulan [simulasi]." action={<Badge tone="warn"><Icon icon={TrendingUp} size={13} />+{Math.round((trend.demand.at(-1)! / trend.demand[0] - 1) * 100)}%</Badge>} /><LineChart label="Permintaan produksi" values={trend.demand} labels={trend.months} unit="juta pak" decimals={1} /></Card>
      <Card><SectionTitle title="Rencana susu segar masuk" subtitle="Ton per hari [simulasi], kapasitas 320 t/hari." action={<Badge tone={trend.incoming.at(-1)! > trend.capacity ? "crit" : "warn"}>{trend.incoming.at(-1)} t/hari</Badge>} /><LineChart label="Rencana susu segar masuk" values={trend.incoming} labels={trend.months} unit="t/hari" reference={{ value: trend.capacity, label: "Kapasitas 320 t/hari" }} /></Card>
    </div>
    <Card className="page-block"><SectionTitle title="Kebutuhan susu dari rencana produksi" subtitle={`Rencana produksi hari ini diterjemahkan ke susu segar, termasuk susut proses ${PROCESS_LOSS * 100}% [asumsi].`} action={<Badge tone={gap >= 0 ? "ok" : "crit"}>{gap >= 0 ? `Pasokan cukup, sisa ${number(gap)} L` : `Kurang ${number(-gap)} L`}</Badge>} />
      <div className="table-wrap"><table><thead><tr><th>SKU</th><th>Kemasan</th><th className="numeric">Rencana</th><th className="numeric">Volume produk</th><th className="numeric">Susu segar</th></tr></thead><tbody>{demandPlan.map(d => <tr key={d.sku}><td><strong>{d.sku}</strong></td><td data-label="Kemasan">{d.pack}</td><td data-label="Rencana" className="numeric">{number(d.packs)} pak</td><td data-label="Volume produk" className="numeric">{number(product(d))} L</td><td data-label="Susu segar" className="numeric">{number(milkNeed(d))} L</td></tr>)}</tbody>
        <tfoot><tr><td colSpan={4}>Total kebutuhan termasuk susut</td><td className="numeric"><strong>{number(needTotal)} L</strong></td></tr><tr><td colSpan={4}>Rencana kirim farm hari ini</td><td className="numeric">{number(supplyTotal)} L</td></tr><tr><td colSpan={4}>Kapasitas olah 320 t/hari</td><td className="numeric">{number(CAPACITY_L)} L</td></tr></tfoot></table></div>
    </Card>
    <Card><SectionTitle title="Jadwal kirim dan kesiapan mutu farm" />
      <div className="table-wrap"><table><thead><tr><th>Farm</th><th className="numeric">Rencana</th><th className="numeric">Tiba</th><th className="numeric">Di jalan</th><th className="numeric">Lolos lab 30 hari</th><th className="numeric">Suhu muat</th><th>Temuan terakhir</th></tr></thead><tbody>{farms.map(f => <tr key={f.name}><td><strong>{f.name}</strong></td><td data-label="Rencana" className="numeric">{f.plannedRt} RT · {number(f.plannedL)} L</td><td data-label="Tiba" className="numeric">{f.arrived}</td><td data-label="Di jalan" className="numeric">{f.onTheWay}</td><td data-label="Lolos lab 30 hari" className="numeric"><Badge tone={f.tone}>{number(f.passRate)}%</Badge></td><td data-label="Suhu muat" className="numeric">{number(f.coolingC)} °C</td><td data-label="Temuan terakhir">{f.finding}</td></tr>)}</tbody></table></div>
    </Card>
  </div>;
}
