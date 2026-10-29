"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ClipboardList, Clock3, Container, Lock, SprayCan, Thermometer, Truck } from "lucide-react";
import { scenario } from "@/lib/data";
import { number, time } from "@/lib/format";
import { acknowledge, useDemo } from "@/lib/demo";
import { ROLES } from "@/lib/roles";
import { instructions } from "@/lib/rules";
import { cipLog, midTanks, type MidTank } from "@/mock/ops";
import type { Tone } from "@/mock/types";
import { Badge, Card, Icon, PageHeading, SectionTitle, SourceModal, Timeline } from "@/components/ui";

const plan = scenario.plans[0];
const bays = scenario.assets.filter(a => a.kind === "Bay");
const buffers = scenario.assets.filter(a => a.kind === "Buffer");
const NOW = 102;
const MID_STATE: Record<MidTank["state"], { label: string; tone: Tone }> = { terisi: { label: "Terisi", tone: "ok" }, kosong: { label: "Kosong, siap", tone: "neutral" }, cip: { label: "CIP", tone: "warn" }, tertahan: { label: "Tertahan", tone: "crit" } };
const notReady = midTanks.filter(t => t.state === "cip" || t.state === "tertahan").length;

/** Kartu instruksi dari rencana yang disetujui; dipakai di Bay & Tangki (receiving) dan Lini Filling (supervisor). */
export function Instructions({ role }: { role: "receiving" | "supervisor" }) {
  const demo = useDemo();
  const approved = demo.decisions.find(d => d.plan === plan.id && d.status === "approved");
  const list = instructions(plan).filter(i => i.role === role);
  const allowed = demo.role === role;
  if (!approved) return <section className="callout"><Icon icon={ClipboardList} size={18} /><div><strong>Belum ada rencana yang disetujui</strong><p>Jadwal di halaman ini mengikuti rencana awal (FIFO). Instruksi muncul setelah planner menyetujui rekomendasi solver.</p></div><Link className="text-link" href="/rencana">Buka Rencana & What-if<Icon icon={ArrowRight} size={14} /></Link></section>;
  const done = list.filter(i => demo.acks.includes(i.id)).length;
  return <Card className="instruction-card"><SectionTitle title="Instruksi dari rencana yang disetujui" subtitle={`Disetujui ${approved.by} pukul ${approved.at}. Konfirmasi setiap instruksi setelah dijalankan di lapangan.`} action={<Badge tone={done === list.length ? "ok" : "warn"}>{done}/{list.length} dikonfirmasi</Badge>} />
    <ul className="instruction-list">{list.map(item => { const acked = demo.acks.includes(item.id); return <li key={item.id} className={acked ? "done" : ""}><span className="instruction-icon"><Icon icon={acked ? Check : role === "receiving" ? Truck : Container} size={16} /></span><span><strong>{item.text}</strong><small>{item.from}</small></span>{acked ? <Badge tone="ok">Dikonfirmasi</Badge> : <button className="button secondary" disabled={!allowed} onClick={() => acknowledge(item.id, item.text)}>Konfirmasi</button>}</li>; })}</ul>
    {!allowed && <p className="role-note"><Icon icon={Lock} size={14} /><span>Hanya {ROLES[role].label} yang mengonfirmasi instruksi ini. Ganti peran lewat kartu akun di sidebar.</span></p>}
  </Card>;
}

export function Tangki() {
  const demo = useDemo();
  const [source, setSource] = useState<string | null>(null);
  const approved = demo.decisions.some(d => d.plan === plan.id && d.status === "approved");
  const blocks = plan[approved ? "after" : "before"];
  const nextOn = (bay: string) => blocks.filter(b => b.resource === bay && b.start >= NOW && b.label.startsWith("RT")).sort((a, b) => a.start - b.start)[0];

  return <div className="page-enter">
    <PageHeading title="Bay & Tangki" subtitle="Status bay, level Raw Milk Buffer, suhu, dan jadwal CIP per aset."><Badge>{approved ? "Mengikuti rekomendasi disetujui" : "Mengikuti rencana awal (FIFO)"}</Badge></PageHeading>
    <Instructions role="receiving" />
    <div className="tanks-grid assets-grid page-block">{bays.map(bay => {
      const next = nextOn(bay.id);
      const cip = cipLog.find(c => c.asset === bay.id)!;
      return <div className="tank-card" key={bay.id}>
        <div className="tank-top"><span className="tank-id"><Icon icon={Truck} size={18} /><span className="mono">{bay.id}</span></span><Badge tone={bay.tone}>{bay.status}</Badge></div>
        <p className="tank-volume">{number(bay.fill)}<span> / {number(bay.capacity)} {bay.unit}</span></p>
        <div className={`capacity-bar ${bay.tone}`} role="meter" aria-label={`${bay.id}: ${bay.status}`} aria-valuenow={bay.fill} aria-valuemin={0} aria-valuemax={bay.capacity}><span style={{ width: `${bay.fill / bay.capacity * 100}%` }} /></div>
        <dl className="fact-list"><div><dt>Selesai</dt><dd>{bay.info.replace("Selesai ", "")}</dd></div><div><dt>RT berikutnya</dt><dd>{next ? `${next.label.replace(" bentrok CIP", "")} · ${time(next.start)}` : "Belum ada"}</dd></div><div><dt>CIP terakhir</dt><dd>{cip.last}</dd></div><div><dt>CIP berikutnya</dt><dd>{cip.next}</dd></div></dl>
        <div className="tank-footer"><span><Clock3 size={13} strokeWidth={1.75} aria-hidden />{cip.status}</span><button aria-label={`Lihat sumber ${bay.id}`} onClick={() => setSource(bay.source)}>Sumber<Icon icon={ArrowUpRight} size={13} /></button></div>
      </div>;
    })}</div>
    <Card className="gantt-card"><SectionTitle title="Jadwal bongkar dan CIP" subtitle={approved ? "Rekomendasi solver yang sudah disetujui planner." : "Rencana awal. Blok merah bentrok dengan CIP Bay 2."} action={<Link className="text-link" href="/rencana">Bandingkan rencana<Icon icon={ArrowRight} size={14} /></Link>} /><Timeline blocks={blocks} resources={["Bay 1", "Bay 2", "Bay 3"]} onSource={setSource} /></Card>
    <div className="split-even">
      <section className="panel"><SectionTitle title="Raw Milk Buffer" subtitle="Level dan suhu tangki susu mentah, kapasitas 60.000 L per tangki." /><div className="tanks-grid single">{buffers.map(tank => { const pct = Math.round(tank.fill / tank.capacity * 100); const cip = cipLog.find(c => c.asset === tank.id)!; return <div className="tank-card" key={tank.id}>
        <div className="tank-top"><span className="tank-id"><Icon icon={Container} size={18} /><span className="mono">{tank.id}</span></span><Badge tone={tank.tone}>{tank.status}</Badge></div>
        <p className="tank-volume">{number(tank.fill)}<span> / {number(tank.capacity)} L · {pct}%</span></p>
        <div className={`capacity-bar ${tank.tone}`} role="meter" aria-label={`${tank.id} terisi ${pct}%`} aria-valuenow={tank.fill} aria-valuemin={0} aria-valuemax={tank.capacity}><span style={{ width: `${pct}%` }} /></div>
        <div className="tank-footer"><span><Thermometer size={13} strokeWidth={1.75} aria-hidden />{tank.info} · sisa {number(tank.capacity - tank.fill)} L · CIP {cip.hoursSince} jam lalu</span><button aria-label={`Lihat sumber ${tank.id}`} onClick={() => setSource(tank.source)}>Sumber<Icon icon={ArrowUpRight} size={13} /></button></div>
      </div>; })}</div></section>
      <Card><SectionTitle title="Log CIP per aset" subtitle="Batas antar-CIP tangki 24 jam [asumsi]." action={<button className="icon-button" aria-label="Lihat log CIP Bay 2" onClick={() => setSource("CIP-LOG")}><Icon icon={SprayCan} size={17} /></button>} /><div className="table-wrap"><table><thead><tr><th>Aset</th><th>CIP terakhir</th><th className="numeric">Jam sejak CIP</th><th>Berikutnya</th><th>Status</th></tr></thead><tbody>{cipLog.map(c => <tr key={c.asset}><td><strong className="mono">{c.asset}</strong></td><td data-label="CIP terakhir">{c.last}</td><td data-label="Jam sejak CIP" className="numeric">{number(c.hoursSince)} j</td><td data-label="Berikutnya">{c.next}</td><td data-label="Status"><Badge tone={c.tone}>{c.status}</Badge></td></tr>)}</tbody></table></div></Card>
    </div>
    <Card><SectionTitle title="Storage, cream, premix, dan mixing" subtitle="Tangki tengah proses tempat serah-terima batch. Tangki yang CIP atau tertahan tidak bisa menerima batch baru." action={<Badge tone={notReady ? "warn" : "ok"}>{notReady} tidak siap menerima</Badge>} />
      <div className="mid-grid">{midTanks.map(t => { const pct = Math.round(t.level / t.capacity * 100); return <div key={t.id} className="tank-card">
        <div className="tank-top"><span className="tank-id"><span className="mono">{t.id}</span><small className="muted">{t.group}</small></span><Badge tone={MID_STATE[t.state].tone}>{MID_STATE[t.state].label}</Badge></div>
        <p className="small"><strong>{t.content}</strong>{t.batch !== "-" && <span className="mono muted"> · {t.batch}</span>}</p>
        <div className={`capacity-bar ${MID_STATE[t.state].tone}`} role="meter" aria-label={`${t.id} terisi ${pct}%`} aria-valuenow={t.level} aria-valuemin={0} aria-valuemax={t.capacity}><span style={{ width: `${pct}%` }} /></div>
        <p className="small muted">{number(t.level)} / {number(t.capacity)} L · {t.note}</p>
      </div>; })}</div>
      <button className="text-link" onClick={() => setSource("TR-ST4")}>Contoh serah-terima SP-1 ke ST-4<Icon icon={ArrowUpRight} size={14} /></button>
    </Card>
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
