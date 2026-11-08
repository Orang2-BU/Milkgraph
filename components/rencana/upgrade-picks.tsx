"use client";

import { ArrowRight, CircleMinus, TrendingUp } from "lucide-react";
import { Icon } from "@/components/ui";
import { Equipment } from "@/components/trace/equipment";
import { ASSETS } from "@/lib/assets";
import { asepticTanks, fillers } from "@/mock/ops";
import { rankUpgrades } from "./recommend";

/** Rekomendasi dari data snapshot; dipakai juga oleh panel atur alat di Alur rencana. */
export const UPGRADES = rankUpgrades(asepticTanks, fillers);
const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

/** Tab Rekomendasi upgrade (poin 10): alat mana yang paling menambah produksi bila di-upgrade, berurutan dari yang terbesar. */
export function UpgradePicks({ onTry }: { onTry: (id: string, pct: number) => void }) {
  const { picks, skips } = UPGRADES;
  const kind = (id: string) => ASSETS.find(a => a.id === id)?.kind ?? "filler";

  return <section className="upgrade-picks" aria-labelledby="upgrade-title">
    <header className="upgrade-head">
      <div>
        <h2 id="upgrade-title">Upgrade mana yang paling menambah produksi?</h2>
        <p>Di tiap jalur, alat yang membatasi aliran susu itulah yang layak di-upgrade. Angkanya kenaikan kapasitas yang dibutuhkan, diurutkan dari tambahan produksi terbesar.</p>
      </div>
    </header>

    <ol className="upgrade-list">
      {picks.map((p, i) => <li key={p.id} className="card upgrade-item">
        <span className="upgrade-rank" aria-label={`Peringkat ${i + 1}`}>{i + 1}</span>
        <Equipment kind={kind(p.id)} size={40} />
        <div className="upgrade-body">
          <h3><span className="mono">{p.id}</span> <span className="muted">jalur {p.line}</span></h3>
          <p>{p.reason}</p>
        </div>
        <div className="upgrade-gain">
          <strong><Icon icon={TrendingUp} size={16} />+{fmt(p.gain)} L/jam</strong>
          <span>{fmt(p.from)} ke {fmt(p.from + p.gain)} L/jam (naik {p.pct}%)</span>
          <span>sekitar +{fmt(p.gain * 8)} L per shift 8 jam</span>
        </div>
        <button type="button" className="button secondary" onClick={() => onTry(p.id, p.pct)}>Coba di Alur rencana<Icon icon={ArrowRight} size={16} /></button>
      </li>)}
    </ol>

    {skips.length > 0 && <details className="card upgrade-skips">
      <summary><Icon icon={CircleMinus} size={15} />Tidak disarankan sekarang ({skips.length} alat)</summary>
      <ul>{skips.map(s => <li key={s.id}><strong className="mono">{s.id}</strong> {s.reason}</li>)}</ul>
    </details>}

    <p className="small muted">Dihitung dari pasokan aseptic tank dan kebutuhan mesin filling yang jalan pada snapshot 14.42 [simulasi]. Batas kapasitas mesin dari pabrikan belum ada di data, jadi kelayakan teknis upgrade-nya perlu dicek terpisah [asumsi]. Jalur yang sedang CIP atau siaga tidak dihitung.</p>
  </section>;
}
