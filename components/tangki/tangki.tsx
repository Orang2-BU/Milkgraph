"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ClipboardList, Clock3, Container, Lock, SprayCan, Thermometer, Truck, X } from "lucide-react";
import { scenario } from "@/lib/data";
import { number, time } from "@/lib/format";
import { acknowledge, useDemo } from "@/lib/demo";
import { ROLES } from "@/lib/roles";
import { instructions } from "@/lib/rules";
import { cipLog as mockCipLog, midTanks as mockMidTanks, type MidTank } from "@/mock/ops";
import type { Block, Tone } from "@/mock/types";
import { API_MODE, apiSend } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { Badge, Card, Icon, PageHeading, SectionTitle, SourceModal, Timeline } from "@/components/ui";

const MID_STATE: Record<string, { label: string; tone: Tone }> = {
  terisi: { label: "Terisi", tone: "ok" },
  kosong: { label: "Kosong, siap", tone: "neutral" },
  cip: { label: "CIP", tone: "warn" },
  tertahan: { label: "Tertahan", tone: "crit" },
};

type Asset = {
  id: string;
  name?: string;
  kind: string;
  status: string;
  fill: number;
  capacity: number;
  unit: string;
  tone: Tone;
  info: string;
  source: string;
};

type CIPLog = {
  asset: string;
  last: string;
  hoursSince: number;
  next: string;
  status: string;
  tone: Tone;
};

type CIPPolicy = {
  tankIntervalHours: number;
};

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

type InstructionItem = {
  id: string;
  role: string;
  text: string;
  from: string;
  ackedBy?: string;
  ackedAt?: string;
};

type PlanCheckResult = {
  before: Record<string, { ok: boolean; text: string }>;
};

/** Kartu instruksi dari rencana yang disetujui; dipakai di Bay & Tangki (receiving) dan Lini Filling (supervisor). */
export function Instructions({ role }: { role: "receiving" | "supervisor" }) {
  const demo = useDemo();
  const [ackError, setAckError] = useState<string | null>(null);
  const [ackingId, setAckingId] = useState<string | null>(null);

  const instructionsResource = useResource<InstructionItem[]>(API_MODE ? "/plans/current/instructions" : null);

  const approved = demo.decisions.find(d => d.plan === "current" && d.status === "approved");

  const list: { id: string; role: string; text: string; from: string; acked?: boolean }[] = API_MODE
    ? (instructionsResource.data ?? []).filter(i => i.role === role).map(i => ({
        ...i,
        acked: Boolean(i.ackedBy || demo.acks.includes(i.id)),
      }))
    : instructions(scenario.plans[0]).filter(i => i.role === role).map(i => ({
        ...i,
        acked: demo.acks.includes(i.id),
      }));

  const allowed = demo.role === role;

  if (!approved) {
    return (
      <section className="callout">
        <Icon icon={ClipboardList} size={18} />
        <div>
          <strong>Belum ada rencana yang disetujui</strong>
          <p>Jadwal di halaman ini mengikuti rencana awal (FIFO). Instruksi muncul setelah planner menyetujui rekomendasi solver.</p>
        </div>
        <Link className="text-link" href="/rencana">
          Buka Rencana & What-if<Icon icon={ArrowRight} size={14} />
        </Link>
      </section>
    );
  }

  const done = list.filter(i => i.acked).length;

  async function handleAck(id: string, text: string) {
    setAckError(null);
    setAckingId(id);
    try {
      await acknowledge(id, text);
    } catch (err) {
      setAckError(err instanceof Error ? err.message : String(err));
    } finally {
      setAckingId(null);
    }
  }

  return (
    <Card className="instruction-card">
      <SectionTitle
        title="Instruksi dari rencana yang disetujui"
        subtitle={`Disetujui ${approved.by} pukul ${approved.at}. Konfirmasi setiap instruksi setelah dijalankan di lapangan.`}
        action={<Badge tone={done === list.length && list.length > 0 ? "ok" : "warn"}>{done}/{list.length} dikonfirmasi</Badge>}
      />
      {ackError && (
        <div className="decision-banner warn" role="alert">
          <Icon icon={X} />
          <span><strong>Gagal mengonfirmasi instruksi</strong><span>{ackError}</span></span>
        </div>
      )}
      <ul className="instruction-list">
        {list.map(item => {
          const acked = item.acked;
          return (
            <li key={item.id} className={acked ? "done" : ""}>
              <span className="instruction-icon">
                <Icon icon={acked ? Check : role === "receiving" ? Truck : Container} size={16} />
              </span>
              <span>
                <strong>{item.text}</strong>
                <small>{item.from}</small>
              </span>
              {acked ? (
                <Badge tone="ok">Dikonfirmasi</Badge>
              ) : (
                <button
                  className="button secondary"
                  disabled={!allowed || ackingId === item.id}
                  onClick={() => handleAck(item.id, item.text)}
                >
                  Konfirmasi
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!allowed && (
        <p className="role-note">
          <Icon icon={Lock} size={14} />
          <span>Hanya {ROLES[role].label} yang mengonfirmasi instruksi ini. Ganti peran lewat kartu akun di sidebar.</span>
        </p>
      )}
    </Card>
  );
}

export function Tangki() {
  const demo = useDemo();
  const [source, setSource] = useState<string | null>(null);

  const assetsRes = useResource<Asset[]>(API_MODE ? "/assets" : null);
  const cipLogRes = useResource<CIPLog[]>(API_MODE ? "/assets/cip-log" : null);
  const cipPolicyRes = useResource<CIPPolicy>(API_MODE ? "/assets/cip-policy" : null);
  const midTanksRes = useResource<MidTank[]>(API_MODE ? "/assets/mid-tanks" : null);
  const metaRes = useResource<Meta>(API_MODE ? "/meta" : null);
  const planRes = useResource<PlanData>(API_MODE ? "/plans/current" : null);

  const [checkResult, setCheckResult] = useState<PlanCheckResult | null>(null);

  useEffect(() => {
    if (!API_MODE) return;
    let live = true;
    void apiSend<PlanCheckResult>("POST", "/plans/current/check", {}, demo.role)
      .then(res => { if (live) setCheckResult(res); })
      .catch(() => {});
    return () => { live = false; };
  }, [demo.role, demo.limits]);

  if (API_MODE) {
    if (
      assetsRes.loading ||
      cipLogRes.loading ||
      cipPolicyRes.loading ||
      midTanksRes.loading ||
      metaRes.loading ||
      planRes.loading ||
      (!assetsRes.data && !assetsRes.error) ||
      (!cipLogRes.data && !cipLogRes.error) ||
      (!planRes.data && !planRes.error)
    ) {
      return <div className="page-enter" role="status">Memuat data Bay & Tangki…</div>;
    }
    const err = assetsRes.error || cipLogRes.error || cipPolicyRes.error || midTanksRes.error || metaRes.error || planRes.error;
    if (err) {
      return <div className="page-enter" role="status">Gagal memuat Bay & Tangki: {err.message}</div>;
    }
    if (!assetsRes.data?.length) {
      return <div className="page-enter" role="status">Tidak ada data aset tersedia.</div>;
    }
  }

  const assets = API_MODE ? assetsRes.data! : scenario.assets;
  const bays = assets.filter(a => a.kind === "Bay");
  const buffers = assets.filter(a => a.kind === "Buffer");
  const cipLogList = API_MODE ? (cipLogRes.data ?? []) : mockCipLog;
  const midTanksList = API_MODE ? (midTanksRes.data ?? []) : mockMidTanks;
  const planData = API_MODE ? planRes.data! : scenario.plans[0];
  const nowOffset = API_MODE ? (metaRes.data?.horizon?.nowOffset ?? 102) : 102;
  const cipInterval = API_MODE ? (cipPolicyRes.data?.tankIntervalHours ?? 24) : 24;

  const approved = demo.decisions.some(d => d.plan === planData.id && d.status === "approved");
  const blocks = planData[approved ? "after" : "before"];
  const nextOn = (bay: string) =>
    blocks
      .filter(b => b.resource === bay && b.start >= nowOffset && b.label.startsWith("RT"))
      .sort((a, b) => a.start - b.start)[0];

  const notReady = midTanksList.filter(t => t.state === "cip" || t.state === "tertahan").length;
  const bufferCap = buffers[0]?.capacity ?? 60000;

  const ganttSubtitle = approved
    ? "Rekomendasi solver yang sudah disetujui planner."
    : checkResult?.before?.cip?.text
    ? `Rencana awal. ${checkResult.before.cip.text}`
    : "Rencana awal. Blok merah bentrok dengan CIP Bay 2.";

  return (
    <div className="page-enter">
      <PageHeading title="Bay & Tangki" subtitle="Status bay, level Raw Milk Buffer, suhu, dan jadwal CIP per aset.">
        <Badge>{approved ? "Mengikuti rekomendasi disetujui" : "Mengikuti rencana awal (FIFO)"}</Badge>
      </PageHeading>
      <Instructions role="receiving" />
      <div className="tanks-grid assets-grid page-block">
        {bays.map(bay => {
          const next = nextOn(bay.id);
          const cip = cipLogList.find(c => c.asset === bay.id) ?? { last: "-", hoursSince: 0, next: "-", status: "-", tone: "neutral" as Tone };
          return (
            <div className="tank-card" key={bay.id}>
              <div className="tank-top">
                <span className="tank-id"><Icon icon={Truck} size={18} /><span className="mono">{bay.id}</span></span>
                <Badge tone={bay.tone}>{bay.status}</Badge>
              </div>
              <p className="tank-volume">{number(bay.fill)}<span> / {number(bay.capacity)} {bay.unit}</span></p>
              <div className={`capacity-bar ${bay.tone}`} role="meter" aria-label={`${bay.id}: ${bay.status}`} aria-valuenow={bay.fill} aria-valuemin={0} aria-valuemax={bay.capacity}>
                <span style={{ width: `${(bay.fill / bay.capacity) * 100}%` }} />
              </div>
              <dl className="fact-list">
                <div><dt>Selesai</dt><dd>{bay.info.replace("Selesai ", "")}</dd></div>
                <div><dt>RT berikutnya</dt><dd>{next ? `${next.label.replace(" bentrok CIP", "")} · ${time(next.start)}` : "Belum ada"}</dd></div>
                <div><dt>CIP terakhir</dt><dd>{cip.last}</dd></div>
                <div><dt>CIP berikutnya</dt><dd>{cip.next}</dd></div>
              </dl>
              <div className="tank-footer">
                <span><Clock3 size={13} strokeWidth={1.75} aria-hidden />{cip.status}</span>
                <button aria-label={`Lihat sumber ${bay.id}`} onClick={() => setSource(bay.source)}>
                  Sumber<Icon icon={ArrowUpRight} size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <Card className="gantt-card">
        <SectionTitle
          title="Jadwal bongkar dan CIP"
          subtitle={ganttSubtitle}
          action={<Link className="text-link" href="/rencana">Bandingkan rencana<Icon icon={ArrowRight} size={14} /></Link>}
        />
        <Timeline blocks={blocks as unknown as Block[]} resources={["Bay 1", "Bay 2", "Bay 3"]} onSource={setSource} />
      </Card>
      <div className="split-even">
        <section className="panel">
          <SectionTitle title="Raw Milk Buffer" subtitle={`Level dan suhu tangki susu mentah, kapasitas ${number(bufferCap)} L per tangki.`} />
          <div className="tanks-grid single">
            {buffers.map(tank => {
              const pct = Math.round((tank.fill / tank.capacity) * 100);
              const cip = cipLogList.find(c => c.asset === tank.id) ?? { last: "-", hoursSince: 0, next: "-", status: "-", tone: "neutral" as Tone };
              return (
                <div className="tank-card" key={tank.id}>
                  <div className="tank-top">
                    <span className="tank-id"><Icon icon={Container} size={18} /><span className="mono">{tank.id}</span></span>
                    <Badge tone={tank.tone}>{tank.status}</Badge>
                  </div>
                  <p className="tank-volume">{number(tank.fill)}<span> / {number(tank.capacity)} L · {pct}%</span></p>
                  <div className={`capacity-bar ${tank.tone}`} role="meter" aria-label={`${tank.id} terisi ${pct}%`} aria-valuenow={tank.fill} aria-valuemin={0} aria-valuemax={tank.capacity}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="tank-footer">
                    <span>
                      <Thermometer size={13} strokeWidth={1.75} aria-hidden />
                      {tank.info} · sisa {number(tank.capacity - tank.fill)} L · CIP {cip.hoursSince} jam lalu
                    </span>
                    <button aria-label={`Lihat sumber ${tank.id}`} onClick={() => setSource(tank.source)}>
                      Sumber<Icon icon={ArrowUpRight} size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <Card>
          <SectionTitle
            title="Log CIP per aset"
            subtitle={`Batas antar-CIP tangki ${cipInterval} jam [asumsi].`}
            action={<button className="icon-button" aria-label="Lihat log CIP Bay 2" onClick={() => setSource("CIP-LOG")}><Icon icon={SprayCan} size={17} /></button>}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aset</th>
                  <th>CIP terakhir</th>
                  <th className="numeric">Jam sejak CIP</th>
                  <th>Berikutnya</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cipLogList.map(c => (
                  <tr key={c.asset}>
                    <td><strong className="mono">{c.asset}</strong></td>
                    <td data-label="CIP terakhir">{c.last}</td>
                    <td data-label="Jam sejak CIP" className="numeric">{number(c.hoursSince)} j</td>
                    <td data-label="Berikutnya">{c.next}</td>
                    <td data-label="Status"><Badge tone={c.tone}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle
          title="Storage, cream, premix, dan mixing"
          subtitle="Tangki tengah proses tempat serah-terima batch. Tangki yang CIP atau tertahan tidak bisa menerima batch baru."
          action={<Badge tone={notReady ? "warn" : "ok"}>{notReady} tidak siap menerima</Badge>}
        />
        <div className="mid-grid">
          {midTanksList.map(t => {
            const pct = Math.round((t.level / t.capacity) * 100);
            const stateConfig = MID_STATE[t.state] ?? { label: t.state, tone: "neutral" as Tone };
            return (
              <div key={t.id} className="tank-card">
                <div className="tank-top">
                  <span className="tank-id"><span className="mono">{t.id}</span><small className="muted">{t.group}</small></span>
                  <Badge tone={stateConfig.tone}>{stateConfig.label}</Badge>
                </div>
                <p className="small"><strong>{t.content}</strong>{t.batch !== "-" && <span className="mono muted"> · {t.batch}</span>}</p>
                <div className={`capacity-bar ${stateConfig.tone}`} role="meter" aria-label={`${t.id} terisi ${pct}%`} aria-valuenow={t.level} aria-valuemin={0} aria-valuemax={t.capacity}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <p className="small muted">{number(t.level)} / {number(t.capacity)} L · {t.note}</p>
              </div>
            );
          })}
        </div>
        <button className="text-link" onClick={() => setSource("TR-ST4")}>
          Contoh serah-terima SP-1 ke ST-4<Icon icon={ArrowUpRight} size={14} />
        </button>
      </Card>
      <SourceModal id={source} onClose={() => setSource(null)} />
    </div>
  );
}

