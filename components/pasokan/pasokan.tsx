"use client";

import { useState } from "react";
import { ArrowLeftRight, Factory, Milk, Send, Sprout, TrendingUp, X } from "lucide-react";
import { number } from "@/lib/format";
import { sendDemand, useDemo } from "@/lib/demo";
import { can } from "@/lib/roles";
import { demandPlan as mockDemandPlan, farms as mockFarms, fillers as mockFillers, PROCESS_LOSS as MOCK_PROCESS_LOSS, trend as mockTrend } from "@/mock/ops";
import type { Tone } from "@/mock/types";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { Badge, Card, Icon, PageHeading, RoleNote, SectionTitle } from "@/components/ui";
import { LineChart } from "./line-chart";

type DemandLine = {
  sku: string;
  pack: string;
  packs: number;
  litresPerPack: number;
  milk: number;
};

type DemandPlanData = {
  lines: DemandLine[];
  processLoss: number;
  capacityTonPerDay: number;
  capacityL: number;
  milkDensity: number;
};

type Farm = {
  name: string;
  plannedRt: number;
  plannedL: number;
  arrived: number;
  onTheWay: number;
  passRate: number;
  coolingC: number;
  finding: string;
  tone: Tone;
};

type Filler = {
  id: string;
  state: string;
};

type SupplyTrend = {
  months: string[];
  demand: number[];
  incoming: number[];
  capacity: number;
};

type DemandSend = {
  sent: boolean;
  at: string;
  by: string;
  detail: string;
};

export function Pasokan() {
  const demo = useDemo();
  const [actionError, setActionError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const farmsRes = useResource<Farm[]>(API_MODE ? "/supply/farms" : null);
  const demandPlanRes = useResource<DemandPlanData>(API_MODE ? "/supply/demand-plan" : null);
  const trendRes = useResource<SupplyTrend>(API_MODE ? "/supply/trend" : null);
  const demandSendsRes = useResource<DemandSend[]>(API_MODE ? "/supply/demand-sends" : null);
  const fillersRes = useResource<Filler[]>(API_MODE ? "/production/fillers" : null);

  if (API_MODE) {
    if (
      farmsRes.loading ||
      demandPlanRes.loading ||
      trendRes.loading ||
      (!farmsRes.data && !farmsRes.error) ||
      (!demandPlanRes.data && !demandPlanRes.error)
    ) {
      return <div className="page-enter" role="status">Memuat data Pasokan & Permintaan…</div>;
    }
    const err = farmsRes.error || demandPlanRes.error || trendRes.error || demandSendsRes.error || fillersRes.error;
    if (err) {
      return <div className="page-enter" role="status">Gagal memuat Pasokan & Permintaan: {err.message}</div>;
    }
    if (!farmsRes.data?.length || !demandPlanRes.data?.lines?.length) {
      return <div className="page-enter" role="status">Tidak ada data pasokan dan permintaan tersedia.</div>;
    }
  }

  const demandPlanLines = API_MODE ? (demandPlanRes.data?.lines ?? []) : mockDemandPlan;
  const processLoss = API_MODE ? (demandPlanRes.data?.processLoss ?? 0.02) : MOCK_PROCESS_LOSS;
  const capacityL = API_MODE ? (demandPlanRes.data?.capacityL ?? 310680) : Math.round(320_000 / 1.03);
  const farmsList = API_MODE ? (farmsRes.data ?? []) : mockFarms;
  const fillersList = API_MODE ? (fillersRes.data ?? []) : mockFillers;
  const trendData = API_MODE ? (trendRes.data ?? { months: [], demand: [], incoming: [], capacity: 320 }) : mockTrend;

  const product = (d: DemandLine) => d.packs * d.litresPerPack;
  const milkNeed = (d: DemandLine) => Math.round(product(d) * d.milk);
  const needTotal = Math.round(demandPlanLines.reduce((sum, d) => sum + milkNeed(d), 0) / (1 - processLoss));
  const supplyTotal = farmsList.reduce((sum, f) => sum + f.plannedL, 0);
  const rtTotal = farmsList.reduce((sum, f) => sum + f.plannedRt, 0);
  const running = fillersList.filter(f => f.state === "jalan").length;

  const allowed = can(demo.role, "demand.send");
  const sent = API_MODE
    ? demandSendsRes.data?.find(s => s.sent) ?? demo.log.find(e => e.title === "Kebutuhan susu dikirim ke farm")
    : demo.log.find(e => e.title === "Kebutuhan susu dikirim ke farm");
  const gap = supplyTotal - needTotal;

  async function handleSend() {
    if (!allowed || !!sent || sending) return;
    setActionError(null);
    setSending(true);
    try {
      await sendDemand(`${number(needTotal)} L untuk ${demandPlanLines.length} SKU, ${rtTotal} RT dari ${farmsList.length} farm`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-enter">
      <PageHeading title="Pasokan & Permintaan" subtitle="Rencana kirim farm, kebutuhan susu dari rencana produksi, dan kapasitas pabrik dalam satu tempat untuk PPIC.">
        <button className="button primary" disabled={!allowed || !!sent || sending} onClick={handleSend}>
          <Icon icon={Send} size={16} />{sent ? `Terkirim ${sent.at}` : "Kirim kebutuhan ke farm"}
        </button>
      </PageHeading>
      <RoleNote permission="demand.send" />
      {actionError && (
        <div className="decision-banner warn" role="alert">
          <Icon icon={X} />
          <span><strong>Gagal mengirim kebutuhan</strong><span>{actionError}</span></span>
        </div>
      )}
      <section className="dept-flow" aria-label="Alur antar-departemen">
        <div className="dept"><span className="dept-icon"><Icon icon={Sprout} size={18} /></span><strong>Farms</strong><small>Pasokan susu, jadwal kirim, kesiapan mutu</small></div>
        <div className="dept-links"><span><Icon icon={ArrowLeftRight} size={13} />Rencana kirim: {rtTotal} RT, {number(supplyTotal)} L</span><span><Icon icon={ArrowLeftRight} size={13} />Kebutuhan: {number(needTotal)} L{sent ? ", terkirim" : ", belum dikirim"}</span></div>
        <div className="dept"><span className="dept-icon"><Icon icon={Milk} size={18} /></span><strong>PPIC</strong><small>Terjemahkan demand, rencana dan alokasi, seimbangkan jadwal</small></div>
        <div className="dept-links"><span><Icon icon={ArrowLeftRight} size={13} />Rencana produksi: {demandPlanLines.length} SKU</span><span><Icon icon={ArrowLeftRight} size={13} />Kapasitas: {Math.round(needTotal / capacityL * 100)}%, {running} filler jalan</span></div>
        <div className="dept"><span className="dept-icon"><Icon icon={Factory} size={18} /></span><strong>Produksi</strong><small>Receiving dan proses, kendali eksekusi, output</small></div>
      </section>
      <div className="split-even">
        <Card><SectionTitle title="Permintaan produksi" subtitle="Juta pak per bulan [simulasi]. Arah naik mengikuti paparan Greenfields." action={<Badge tone="warn"><Icon icon={TrendingUp} size={13} />+{Math.round(((trendData.demand.at(-1) ?? 1) / (trendData.demand[0] || 1) - 1) * 100)}%</Badge>} /><LineChart label="Permintaan produksi" values={trendData.demand} labels={trendData.months} unit="juta pak" decimals={1} /></Card>
        <Card><SectionTitle title="Rencana susu segar masuk" subtitle="Ton per hari [simulasi], dibanding kapasitas 320 t/hari." action={<Badge tone={(trendData.incoming.at(-1) ?? 0) > trendData.capacity ? "crit" : "warn"}>{trendData.incoming.at(-1) ?? 0} t/hari</Badge>} /><LineChart label="Rencana susu segar masuk" values={trendData.incoming} labels={trendData.months} unit="t/hari" reference={{ value: trendData.capacity, label: "Kapasitas 320 t/hari" }} /></Card>
      </div>
      <Card className="page-block"><SectionTitle title="Kebutuhan susu dari rencana produksi" subtitle={`Rencana produksi hari ini diterjemahkan ke susu segar, termasuk susut proses ${processLoss * 100}% [asumsi].`} action={<Badge tone={gap >= 0 ? "ok" : "crit"}>{gap >= 0 ? `Pasokan cukup, sisa ${number(gap)} L` : `Kurang ${number(-gap)} L`}</Badge>} />
        <div className="table-wrap"><table><thead><tr><th>SKU</th><th>Kemasan</th><th className="numeric">Rencana</th><th className="numeric">Volume produk</th><th className="numeric">Susu segar</th></tr></thead><tbody>{demandPlanLines.map(d => <tr key={d.sku}><td><strong>{d.sku}</strong></td><td data-label="Kemasan">{d.pack}</td><td data-label="Rencana" className="numeric">{number(d.packs)} pak</td><td data-label="Volume produk" className="numeric">{number(product(d))} L</td><td data-label="Susu segar" className="numeric">{number(milkNeed(d))} L</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={4}>Total kebutuhan termasuk susut</td><td className="numeric"><strong>{number(needTotal)} L</strong></td></tr><tr><td colSpan={4}>Rencana kirim farm hari ini</td><td className="numeric">{number(supplyTotal)} L</td></tr><tr><td colSpan={4}>Kapasitas olah 320 t/hari</td><td className="numeric">{number(capacityL)} L</td></tr></tfoot></table></div>
      </Card>
      <Card><SectionTitle title="Jadwal kirim dan kesiapan mutu farm" subtitle="Rencana RT hari ini dan hasil lab penerimaan 30 hari terakhir." />
        <div className="table-wrap"><table><thead><tr><th>Farm</th><th className="numeric">Rencana</th><th className="numeric">Tiba</th><th className="numeric">Di jalan</th><th className="numeric">Lolos lab 30 hari</th><th className="numeric">Suhu muat</th><th>Temuan terakhir</th></tr></thead><tbody>{farmsList.map(f => <tr key={f.name}><td><strong>{f.name}</strong></td><td data-label="Rencana" className="numeric">{f.plannedRt} RT · {number(f.plannedL)} L</td><td data-label="Tiba" className="numeric">{f.arrived}</td><td data-label="Di jalan" className="numeric">{f.onTheWay}</td><td data-label="Lolos lab 30 hari" className="numeric"><Badge tone={f.tone}>{number(f.passRate)}%</Badge></td><td data-label="Suhu muat" className="numeric">{number(f.coolingC)} °C</td><td data-label="Temuan terakhir">{f.finding}</td></tr>)}</tbody></table></div>
      </Card>
    </div>
  );
}

