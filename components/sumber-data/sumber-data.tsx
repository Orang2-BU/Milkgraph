"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Database, PlugZap, RefreshCw, ShieldCheck } from "lucide-react";
import { demoClock, useDemo } from "@/lib/demo";
import { dataSources, type DataSource } from "@/mock/ops";
import { Badge, Card, Icon, PageHeading, SectionTitle } from "@/components/ui";
import { API_MODE, apiSend } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";

type Check = { state: "running" } | { state: "done"; ok: boolean; text: string };

export function SumberData() {
  const demo = useDemo();
  const sourcesRes = useResource<DataSource[]>(API_MODE ? "/data-sources" : null);
  const [synced, setSynced] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [syncErrors, setSyncErrors] = useState<Record<string, string | null>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (API_MODE && sourcesRes.loading && !sourcesRes.data) {
    return (
      <div className="page-enter" role="status">
        <PageHeading title="Sumber Data" subtitle="Sistem pabrik yang mengisi context graph. Semua koneksi read-only: MilkGraph membaca data, tidak mengendalikan mesin." />
        <p className="muted">Memuat sumber data…</p>
      </div>
    );
  }

  if (API_MODE && sourcesRes.error) {
    return (
      <div className="page-enter" role="alert">
        <PageHeading title="Sumber Data" subtitle="Sistem pabrik yang mengisi context graph. Semua koneksi read-only: MilkGraph membaca data, tidak mengendalikan mesin." />
        <p className="crit-text">Gagal memuat sumber data: {sourcesRes.error.message}</p>
      </div>
    );
  }

  const sources = API_MODE ? (sourcesRes.data ?? []) : dataSources;

  if (API_MODE && sources.length === 0) {
    return (
      <div className="page-enter" role="status">
        <PageHeading title="Sumber Data" subtitle="Sistem pabrik yang mengisi context graph. Semua koneksi read-only: MilkGraph membaca data, tidak mengendalikan mesin." />
        <p className="muted">Tidak ada sumber data yang tersedia.</p>
      </div>
    );
  }

  async function test(id: string) {
    if (!API_MODE) {
      const source = dataSources.find(s => s.id === id);
      if (!source) return;
      setChecks(c => ({ ...c, [id]: { state: "running" } }));
      timers.current.push(
        setTimeout(
          () =>
            setChecks(c => ({
              ...c,
              [id]:
                source.status === "terhubung"
                  ? { state: "done", ok: true, text: `Terhubung, ${source.latencyMs} ms, hak akses baca saja` }
                  : { state: "done", ok: false, text: "Batch harian, data berikutnya 06.00 besok" },
            })),
          700
        )
      );
      return;
    }

    setChecks(c => ({ ...c, [id]: { state: "running" } }));
    try {
      const res = await apiSend<{ ok: boolean; text: string; latencyMs: number }>(
        "POST",
        `/data-sources/${encodeURIComponent(id)}/test`,
        {},
        demo.role
      );
      setChecks(c => ({ ...c, [id]: { state: "done", ok: res.ok, text: res.text } }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menguji koneksi";
      setChecks(c => ({ ...c, [id]: { state: "done", ok: false, text: msg } }));
    }
  }

  async function sync(id: string) {
    if (!API_MODE) {
      setSynced(v => ({ ...v, [id]: demoClock() }));
      return;
    }

    setSyncing(s => ({ ...s, [id]: true }));
    setSyncErrors(e => ({ ...e, [id]: null }));
    try {
      const res = await apiSend<{ result: DataSource; log: null }>(
        "POST",
        `/data-sources/${encodeURIComponent(id)}/sync`,
        {},
        demo.role
      );
      if (res?.result?.lastSync) {
        setSynced(v => ({ ...v, [id]: res.result.lastSync }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal sinkronisasi data";
      setSyncErrors(e => ({ ...e, [id]: msg }));
    } finally {
      setSyncing(s => ({ ...s, [id]: false }));
    }
  }

  return (
    <div className="page-enter">
      <PageHeading title="Sumber Data" subtitle="Sistem pabrik yang mengisi context graph. Semua koneksi read-only: MilkGraph membaca data, tidak mengendalikan mesin." />
      <section className="callout">
        <Icon icon={ShieldCheck} size={18} />
        <div>
          <strong>Konektor simulasi</strong>
          <p>Di mockup, setiap konektor membaca data skenario. Integrasi SCADA, LIMS, dan weighbridge nyata ada di tahap prototipe.</p>
        </div>
        <Link className="text-link" href="/graph">
          Lihat context graph
          <Icon icon={ArrowRight} size={14} />
        </Link>
      </section>
      <div className="source-grid">
        {sources.map(s => {
          const check = checks[s.id];
          const isSyncing = Boolean(syncing[s.id]);
          const syncErr = syncErrors[s.id];
          return (
            <Card key={s.id} className="source-card">
              <div className="tank-top">
                <span className="tank-id">
                  <Icon icon={Database} size={18} />
                  <strong>{s.name}</strong>
                </span>
                <Badge tone={s.status === "terhubung" ? "ok" : "warn"}>
                  {s.status === "terhubung" ? "Terhubung" : "Menunggu batch"}
                </Badge>
              </div>
              <p className="small muted">{s.system}</p>
              <dl className="fact-list">
                <div>
                  <dt>Protokol</dt>
                  <dd>{s.protocol}</dd>
                </div>
                <div>
                  <dt>Interval</dt>
                  <dd>{s.interval}</dd>
                </div>
                <div>
                  <dt>Sinkron terakhir</dt>
                  <dd>{synced[s.id] ?? s.lastSync}</dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>{s.records}</dd>
                </div>
              </dl>
              <p className="feeds">
                <span className="small muted">Mengisi graph:</span> <span className="mono">{s.feeds}</span>
              </p>
              {check && (
                <p className={`small with-icon ${check.state === "done" ? (check.ok ? "ok-text" : "warn-text") : "muted"}`} role="status">
                  {check.state === "running" ? "Menguji koneksi..." : check.text}
                </p>
              )}
              {syncErr && (
                <p className="small crit-text" role="alert">
                  {syncErr}
                </p>
              )}
              <div className="page-actions">
                <button
                  className="button secondary"
                  disabled={check?.state === "running" || isSyncing}
                  onClick={() => void test(s.id)}
                >
                  <Icon icon={PlugZap} size={16} />
                  Uji koneksi
                </button>
                <button
                  className="button secondary"
                  disabled={isSyncing || (!API_MODE && s.status !== "terhubung")}
                  onClick={() => void sync(s.id)}
                >
                  <Icon icon={RefreshCw} size={16} />
                  {isSyncing ? "Menyinkronkan…" : "Sinkron sekarang"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <Card>
        <SectionTitle title="Pemetaan ke context graph" subtitle="Setiap node dan relasi punya satu sumber utama." />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sumber</th>
                <th>Node dan relasi</th>
                <th>Interval</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(s => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td data-label="Node dan relasi">
                    <span className="mono">{s.feeds}</span>
                  </td>
                  <td data-label="Interval">{s.interval}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
