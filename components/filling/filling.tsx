"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Factory, Flame, Gauge, TriangleAlert } from "lucide-react";
import { scenario } from "@/lib/data";
import { number, time } from "@/lib/format";
import { useDemo } from "@/lib/demo";
import { starvation } from "@/lib/rules";
import { asepticTanks as mockAsepticTanks, changeoverMatrix as mockChangeover, fillers as mockFillers, UNIT_STATE as mockUnitState } from "@/mock/ops";
import { Instructions } from "@/components/tangki/tangki";
import type { Block, Tone } from "@/mock/types";
import { API_MODE, apiSend } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { Badge, Card, Icon, PageHeading, SectionTitle, SourceButton, SourceModal, Timeline } from "@/components/ui";

type AsepticTank = {
  id: string;
  sterilizer: string;
  sterilizerState: string;
  product: string;
  level: number;
  capacity: number;
  inflow: { before: number; after: number };
  fillers: string[];
  planned: boolean;
};

type Filler = {
  id: string;
  resource?: string;
  product: string;
  pack: string;
  speed: number;
  target: number;
  output: number;
  litres: number;
  state: string;
  note: string;
  source: string;
};

type Changeover = {
  products: string[];
  minutes: number[][];
  note: string;
};

type UnitStateMap = Record<string, { label: string; tone: Tone }>;

type Meta = {
  now: string;
  horizon: {
    start: string;
    end: string;
    nowOffset: number;
  };
};

type PlanBlock = {
  resource: string;
  label: string;
  start: number;
  end: number;
  type: string;
  source?: string;
};

type PlanData = {
  id: string;
  label: string;
  before: PlanBlock[];
  after: PlanBlock[];
};

export function Filling() {
  const demo = useDemo();
  const [source, setSource] = useState<string | null>(null);

  const asepticTanksRes = useResource<AsepticTank[]>(API_MODE ? "/production/aseptic-tanks" : null);
  const fillersRes = useResource<Filler[]>(API_MODE ? "/production/fillers" : null);
  const unitStatesRes = useResource<UnitStateMap>(API_MODE ? "/production/unit-states" : null);
  const changeoverRes = useResource<Changeover>(API_MODE ? "/production/changeover-matrix" : null);
  const planRes = useResource<PlanData>(API_MODE ? "/plans/current" : null);
  const metaRes = useResource<Meta>(API_MODE ? "/meta" : null);

  const [checkResult, setCheckResult] = useState<{ starvation: { before: number; after: number } } | null>(null);

  useEffect(() => {
    if (!API_MODE) return;
    let live = true;
    void apiSend<{ starvation: { before: number; after: number } }>("POST", "/plans/current/check", {}, demo.role)
      .then(res => { if (live) setCheckResult(res); })
      .catch(() => {});
    return () => { live = false; };
  }, [demo.role, demo.limits]);

  if (API_MODE) {
    if (
      asepticTanksRes.loading ||
      fillersRes.loading ||
      planRes.loading ||
      metaRes.loading ||
      (!asepticTanksRes.data && !asepticTanksRes.error) ||
      (!fillersRes.data && !fillersRes.error) ||
      (!planRes.data && !planRes.error)
    ) {
      return <div className="page-enter" role="status">Memuat data Lini Filling…</div>;
    }
    const err = asepticTanksRes.error || fillersRes.error || unitStatesRes.error || changeoverRes.error || planRes.error || metaRes.error;
    if (err) {
      return <div className="page-enter" role="status">Gagal memuat Lini Filling: {err.message}</div>;
    }
    if (!asepticTanksRes.data?.length) {
      return <div className="page-enter" role="status">Tidak ada data lini filling tersedia.</div>;
    }
  }

  const asepticTanks = API_MODE ? asepticTanksRes.data! : mockAsepticTanks;
  const fillers = API_MODE ? fillersRes.data! : mockFillers;
  const unitStateMap: UnitStateMap = API_MODE ? (unitStatesRes.data ?? {}) : mockUnitState;
  const changeoverMatrix = API_MODE ? (changeoverRes.data ?? { products: [], minutes: [], note: "" }) : mockChangeover;
  const planData = API_MODE ? planRes.data! : scenario.plans[0];
  const nowOffset = API_MODE ? (metaRes.data?.horizon?.nowOffset ?? 102) : 102;
  const nowTime = API_MODE ? (metaRes.data?.now ?? "14.42") : "14.42";

  const approved = demo.decisions.some(d => d.plan === planData.id && d.status === "approved");
  const view = approved ? "after" : "before";
  const breakdown = fillers.filter(f => f.state === "breakdown");

  const filler = (id: string) => fillers.find(f => f.id === id) ?? {
    id,
    product: "-",
    pack: "-",
    speed: 0,
    target: 0,
    output: 0,
    litres: 0,
    state: "standby",
    note: "-",
    source: "",
  };

  const starvationView = API_MODE ? (checkResult?.starvation?.[view] ?? 0) : starvation(planData[view] as unknown as Block[]);
  const starvationBefore = API_MODE ? (checkResult?.starvation?.before ?? 0) : starvation(planData.before as unknown as Block[]);
  const starvationAfter = API_MODE ? (checkResult?.starvation?.after ?? 0) : starvation(planData.after as unknown as Block[]);

  const getUnitState = (state: string) => unitStateMap[state] ?? { label: state, tone: "neutral" as Tone };

  // Calculate AT-2 stoppage for initial subtitle
  const at2 = asepticTanks.find(t => t.id === "AT-2");
  let at2StoppageText = "AT-2 kosong 15.50, F2 dan F4 berhenti bersamaan";
  if (at2) {
    const at2Lines = at2.fillers.map(filler);
    const at2Need = at2Lines.reduce((sum, f) => sum + f.litres, 0);
    const at2Net = at2.inflow.before - at2Need;
    const at2EmptyAt = at2Net < 0 ? nowOffset + Math.round(at2.level / -at2Net * 60) : null;
    const at2Stopped = at2Lines.map(f => f.id).join(" dan ");
    if (at2EmptyAt) {
      at2StoppageText = `${at2.id} kosong ${time(at2EmptyAt)}, ${at2Stopped} berhenti bersamaan`;
    }
  }

  const ganttSubtitle = approved
    ? "Rekomendasi disetujui: F2 dan F4 tetap berjalan."
    : `Rencana awal: ${at2StoppageText}.`;

  return (
    <div className="page-enter">
      <PageHeading title="Lini Filling" subtitle="Lima lini sterilisasi, lima aseptic tank, dan sepuluh mesin filling. Setiap aseptic tank melayani dua mesin filling.">
        <Badge>{approved ? "Mengikuti rekomendasi disetujui" : "Mengikuti rencana awal (FIFO)"}</Badge>
      </PageHeading>
      <Instructions role="supervisor" />
      <div className="split-even page-block">
        {asepticTanks.filter(t => t.planned).map(tank => {
          const lines = tank.fillers.map(filler);
          const need = lines.reduce((sum, f) => sum + f.litres, 0);
          const net = tank.inflow[view] - need;
          const emptyAt = net < 0 ? nowOffset + Math.round(tank.level / -net * 60) : null;
          const pct = Math.round((tank.level / tank.capacity) * 100);
          const short = emptyAt !== null && emptyAt < 420;
          const running = lines.filter(f => f.state === "jalan");
          return (
            <Card key={tank.id} className="line-card">
              <SectionTitle
                title={`${tank.id} · ${tank.product}`}
                subtitle={`Dari ${tank.sterilizer}, melayani ${lines.map(f => f.id).join(" dan ")}`}
                action={<Badge tone={short ? "crit" : "ok"}>{short ? `Kosong ${time(emptyAt!)}` : "Pasokan aman"}</Badge>}
              />
              <div className="tank-card">
                <div className="tank-top">
                  <span className="tank-id"><Icon icon={Factory} size={18} /><span className="mono">{tank.id}</span></span>
                  <span className="small muted">{number(tank.level)} / {number(tank.capacity)} L · {pct}%</span>
                </div>
                <div className={`capacity-bar ${short ? "crit" : pct < 25 ? "warn" : "ok"}`} role="meter" aria-label={`${tank.id} terisi ${pct}%`} aria-valuenow={tank.level} aria-valuemin={0} aria-valuemax={tank.capacity}>
                  <span style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
                <dl className="fact-list">
                  <div><dt>Masuk dari {tank.sterilizer}</dt><dd>{number(tank.inflow[view])} L/jam</dd></div>
                  <div><dt>Dipakai {running.map(f => f.id).join(" + ")}</dt><dd>{number(need)} L/jam</dd></div>
                  <div><dt>Selisih</dt><dd className={net < 0 ? "crit-text" : ""}>{net > 0 ? "+" : ""}{number(net)} L/jam</dd></div>
                  <div><dt>Kosong</dt><dd>{emptyAt === null ? "Level naik" : short ? time(emptyAt) : "Setelah shift"}</dd></div>
                </dl>
              </div>
              <ul className="filler-list">
                {lines.map(f => (
                  <li key={f.id}>
                    <span><strong>{f.id}</strong><small>{f.product} · {f.pack}</small></span>
                    {f.state === "jalan" ? (
                      <span className="filler-speed">
                        <span className="metric-label"><Icon icon={Gauge} size={13} />{number(f.speed)} / {number(f.target)} pak/menit</span>
                        <span className="capacity-bar ok" role="meter" aria-label={`Kecepatan ${f.id}`} aria-valuenow={f.speed} aria-valuemin={0} aria-valuemax={f.target}>
                          <span style={{ width: `${(f.speed / f.target) * 100}%` }} />
                        </span>
                      </span>
                    ) : (
                      <small className="muted">{f.note}</small>
                    )}
                    <span className="numeric small">{number(f.output)} pak<br /><span className="muted">sejak 14.00</span></span>
                  </li>
                ))}
              </ul>
              {lines.length > 1 && running.length > 1 && (
                <p className="small muted with-icon">
                  <Icon icon={TriangleAlert} size={14} />Satu tangki untuk dua lini: bila {tank.id} kosong, {running.map(f => f.id).join(" dan ")} berhenti bersamaan.
                </p>
              )}
              <SourceButton id={tank.id === "AT-2" ? "FLOW-F2" : "FILL-F1"} onSelect={setSource} />
            </Card>
          );
        })}
      </div>
      <Card className="page-block">
        <SectionTitle
          title="Konfigurasi sterilisasi, aseptic, dan filling"
          subtitle={`Status setiap unit pada snapshot ${nowTime}. Aset hilir dipakai bersama, jadi gangguan di satu titik menjalar ke dua lini.`}
          action={breakdown.length ? <Badge tone="crit">{breakdown.length} breakdown</Badge> : undefined}
        />
        <div className="config-grid">
          {asepticTanks.map(tank => {
            const stState = getUnitState(tank.sterilizerState);
            return (
              <div key={tank.id} className={`config-row ${tank.planned ? "planned" : ""}`}>
                <span className="config-unit">
                  <Icon icon={Flame} size={15} />
                  <span><strong>{tank.sterilizer}</strong><Badge tone={stState.tone}>{stState.label}</Badge></span>
                </span>
                <ArrowRight size={14} aria-hidden className="muted" />
                <span className="config-unit">
                  <Icon icon={Factory} size={15} />
                  <span><strong>{tank.id}</strong><small>{tank.level ? `${Math.round((tank.level / tank.capacity) * 100)}%` : "Kosong"} · {tank.product}</small></span>
                </span>
                <ArrowRight size={14} aria-hidden className="muted" />
                <span className="config-fillers">
                  {tank.fillers.map(filler).map(f => {
                    const fState = getUnitState(f.state);
                    return (
                      <span key={f.id} className="config-unit" title={f.note}>
                        <span><strong>{f.id}</strong><Badge tone={fState.tone}>{fState.label}</Badge></span>
                        <small>{f.pack}</small>
                      </span>
                    );
                  })}
                </span>
              </div>
            );
          })}
        </div>
        <p className="small muted">
          Baris bertanda hijau masuk rencana shift ini (F1, F2, F4). {breakdown.map(f => `${f.id}: ${f.note}.`).join(" ")}
        </p>
      </Card>
      <Card className="gantt-card">
        <SectionTitle
          title="Jadwal filling"
          subtitle={ganttSubtitle}
          action={<span className={`recommendation-saving light ${starvationView ? "crit-text" : ""}`}><Icon icon={TriangleAlert} size={15} />Starvation {starvationView} menit</span>}
        />
        <Timeline blocks={planData[view] as unknown as Block[]} resources={["Filling F1", "Filling F2", "Filling F4"]} onSource={setSource} />
        <p className="small muted">
          Rencana awal {starvationBefore} menit per lini, rekomendasi {starvationAfter} menit. <Link className="inline-link" href="/rencana">Buka Rencana & What-if</Link>
        </p>
      </Card>
      <Card>
        <SectionTitle
          title="Matriks changeover (SOP)"
          subtitle="Menit minimum [asumsi]."
          action={<Link className="text-link" href="/constraint">Batas changeover<Icon icon={ArrowRight} size={14} /></Link>}
        />
        <div className="table-wrap">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Dari \ ke</th>
                {changeoverMatrix.products.map(p => <th key={p} className="numeric">{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {changeoverMatrix.products.map((from, i) => (
                <tr key={from}>
                  <td><strong>{from}</strong></td>
                  {changeoverMatrix.minutes[i]?.map((m, j) => (
                    <td key={j} data-label={changeoverMatrix.products[j]} className="numeric">{m ? `${m} mnt` : "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">{changeoverMatrix.note}</p>
        <button className="text-link" onClick={() => setSource("FILL-F1")}>Lihat jadwal F1<Icon icon={ArrowUpRight} size={14} /></button>
      </Card>
      <SourceModal id={source} onClose={() => setSource(null)} />
    </div>
  );
}

