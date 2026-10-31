"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarClock, Crosshair, Mouse, Move3d, Scan } from "lucide-react";
import { Badge, Card, Icon, SectionTitle, Toggle } from "@/components/ui";
import type { Tone } from "@/mock/types";
import { BOTTLENECKS as bottlenecks } from "@/mock/site";
import { PlantScene, type Focus, type SceneState, type SiteLayout, type SiteStatus } from "./plant-scene";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import type { AsepticTank, Filler, MidTank } from "@/mock/ops";

interface BottleneckItem {
  title: string;
  text: string;
  tone: Tone;
  focus: Focus;
}

const legend: { tone: Tone; label: string }[] = [
  { tone: "ok", label: "Normal" },
  { tone: "warn", label: "Waspada" },
  { tone: "crit", label: "Bottleneck" },
  { tone: "neutral", label: "Antre / menunggu" },
];

export function Simulasi() {
  const [state, setState] = useState<SceneState>("before");
  const [focus, setFocus] = useState<Focus>("overview");
  const [roof, setRoof] = useState<"cut" | "on">("cut");

  const layoutRes = useResource<SiteLayout>(API_MODE ? "/site/layout" : null);
  const statusRes = useResource<SiteStatus>(API_MODE ? `/site/status?view=${state}` : null);
  const statusBeforeRes = useResource<SiteStatus>(API_MODE ? "/site/status?view=before" : null);
  const statusAfterRes = useResource<SiteStatus>(API_MODE ? "/site/status?view=after" : null);
  const bottlenecksRes = useResource<BottleneckItem[]>(API_MODE ? `/site/bottlenecks?view=${state}` : null);
  const asepticRes = useResource<AsepticTank[]>(API_MODE ? "/production/aseptic-tanks" : null);
  const fillersRes = useResource<Filler[]>(API_MODE ? "/production/fillers" : null);
  const midTanksRes = useResource<MidTank[]>(API_MODE ? "/assets/mid-tanks" : null);

  const bottlenecksList = API_MODE ? (bottlenecksRes.data ?? []) : bottlenecks[state];
  const summary = bottlenecksList.map(b => `${b.title}: ${b.text}`).join(" ");

  const labelBefore = statusBeforeRes.data?.viewLabel || "Rencana awal · 14.42";
  const labelAfter = statusAfterRes.data?.viewLabel || "Rekomendasi · proyeksi 15.30";

  return (
    <div className="page-enter">
      <div className="page-heading">
        <div>
          <h1>Simulasi 3D</h1>
          <p>Model situs plant dengan tata letak nyata: alur susu, kondisi bay dan tangki, serta lokasi bottleneck.</p>
        </div>
        <Link className="button primary" href="/rencana">
          <Icon icon={CalendarClock} />
          Buka rencana
          <Icon icon={ArrowUpRight} size={16} />
        </Link>
      </div>

      <div className="scenario-bar">
        <Toggle
          label="Kondisi simulasi"
          value={state}
          onChange={setState}
          options={[
            { value: "before", label: labelBefore },
            { value: "after", label: labelAfter },
          ]}
        />
        <Toggle
          label="Atap gedung utama"
          value={roof}
          onChange={setRoof}
          options={[
            { value: "cut", label: "Lihat isi gedung" },
            { value: "on", label: "Tampak atap" },
          ]}
        />
      </div>

      <div className="sim-grid">
        <Card className="sim-canvas-card">
          <PlantScene
            state={state}
            focus={focus}
            roof={roof === "on"}
            label={`Simulasi 3D pabrik, ${state === "before" ? "rencana awal" : "rekomendasi"}. ${summary}`}
            layout={layoutRes.data}
            status={statusRes.data}
            asepticTanks={asepticRes.data}
            fillers={fillersRes.data}
            midTanks={midTanksRes.data}
          />
          <p className="sim-hint small muted">
            <Icon icon={Mouse} size={14} />
            Pilih fungsi seret di pojok kiri bawah (putar atau geser); klik kanan melakukan kebalikannya. Gulir atau cubit untuk zoom ke titik kursor. Keyboard: panah menggeser, Q dan E memutar. Label lain muncul saat diperbesar.
          </p>
        </Card>

        <Card className="sim-side">
          <SectionTitle
            title="Bottleneck"
            subtitle={
              state === "before"
                ? "Kondisi jika rencana FIFO dijalankan. Pilih untuk memfokuskan kamera."
                : "Proyeksi setelah rekomendasi disetujui. Pilih untuk memfokuskan kamera."
            }
            action={
              <button className="icon-button" aria-label="Lihat seluruh pabrik" aria-pressed={focus === "overview"} onClick={() => setFocus("overview")}>
                <Icon icon={Scan} size={17} />
              </button>
            }
          />
          <ol className="bottleneck-list">
            {API_MODE && bottlenecksRes.loading && !bottlenecksRes.data && (
              <li className="small muted" role="status">
                Memuat daftar bottleneck…
              </li>
            )}
            {API_MODE && bottlenecksRes.error && (
              <li className="small crit-text" role="alert">
                Gagal memuat bottleneck: {bottlenecksRes.error.message}
              </li>
            )}
            {API_MODE && !bottlenecksRes.loading && !bottlenecksRes.error && bottlenecksList.length === 0 && (
              <li className="small muted">Tidak ada bottleneck yang terdeteksi.</li>
            )}
            {bottlenecksList.map(b => (
              <li key={b.title}>
                <button
                  className={`bottleneck-item ${focus === b.focus ? "selected" : ""}`}
                  aria-pressed={focus === b.focus}
                  onClick={() => setFocus(b.focus)}
                >
                  <span>
                    <Badge tone={b.tone}>{b.title}</Badge>
                    <Icon icon={Crosshair} size={15} />
                  </span>
                  <p>{b.text}</p>
                </button>
              </li>
            ))}
          </ol>

          <h3 className="legend-title">
            <Icon icon={Move3d} size={16} />
            Legenda warna
          </h3>
          <div className="sim-legend">
            {legend.map(l => (
              <span key={l.tone}>
                <i className={`legend-square tone-${l.tone}`} />
                {l.label}
              </span>
            ))}
            <span>
              <i className="legend-square accent" />
              Aliran susu
            </span>
          </div>
          <p className="small muted">
            Tata letak dan ukuran gedung ditelusuri dari citra satelit publik plant susu di Ngajum, Malang (skala ±0,3 m). Fungsi gedung dan isi ruang proses adalah perkiraan tim mengikuti konfigurasi proses [asumsi]. Status unit digerakkan data simulator [simulasi].
          </p>
        </Card>
      </div>
    </div>
  );
}
