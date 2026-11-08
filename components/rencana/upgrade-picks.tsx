"use client";

import Link from "next/link";
import { CircleMinus, FlaskConical, Plus, TrendingUp, X } from "lucide-react";
import { Icon } from "@/components/ui";
import { Equipment } from "@/components/trace/equipment";
import { ASSETS } from "@/lib/assets";
import { useDemo } from "@/lib/demo";
import { asepticTanks, fillers } from "@/mock/ops";
import type { Plan } from "@/mock/types";
import type { Adjustments } from "./adjust";
import { rankUpgrades } from "./recommend";
import { useRencana } from "./rencana-state";
import { withAdjust } from "./with-adjust";

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const kind = (id: string) => ASSETS.find(a => a.id === id)?.kind ?? "filler";

/**
 * Daftar di Rencana > Rekomendasi upgrade (poin 10). Dihitung ulang dari upgrade yang sedang dicoba dan skenario terpilih:
 * tiap saran menampilkan efeknya ke constraint, dan upgrade yang sudah dicoba pindah ke "Diterapkan ke rencana".
 */
export function UpgradePicks({ onTry }: { onTry: (id: string, pct: number, to: number) => void }) {
  const { adj, setAdj, plans, planId } = useRencana();
  const demo = useDemo();
  const plan = (plans?.find(p => p.id === planId) ?? plans?.[0]) as unknown as Plan | undefined;
  const { picks, skips, tried } = rankUpgrades(asepticTanks, fillers, adj);
  const broken = (a: Adjustments) => plan ? { before: withAdjust(plan, "before", a, demo.limits).broken, after: withAdjust(plan, "after", a, demo.limits).broken } : null;
  const now = broken(adj);
  const release = (id: string) => setAdj(prev => { const next = { ...prev }; delete next[id]; return next; });

  return <section className="upgrade-picks" aria-label="Daftar rekomendasi upgrade">
    {tried.length > 0 && <div className="card upgrade-tried">
      <h2><Icon icon={FlaskConical} size={17} />Diterapkan ke rencana ({tried.length})</h2>
      <ul>{tried.map(x => <li key={x.id}>
        <span><strong className="mono">{x.id}</strong> {fmt(x.from)} ke {fmt(x.to)} L/jam <span className="muted">jalur {x.line}</span></span>
        <span className="upgrade-tried-actions"><Link className="text-link" href="/rencana/alur">Lihat di alur</Link><button type="button" className="text-link" onClick={() => release(x.id)}><Icon icon={X} size={14} />Lepas</button></span>
      </li>)}</ul>
      {now && <p className="small muted">Dengan upgrade ini: rencana awal melanggar {now.before} dari 6 constraint, rekomendasi solver {now.after} dari 6. Angka yang sama dipakai di Kelayakan & keputusan.</p>}
    </div>}

    {picks.length ? <ol className="upgrade-list">
      {picks.map((p, i) => {
        const next = broken({ ...adj, [p.id]: { upgrade: p.pct, upgradeTo: p.from + p.gain } });
        const same = now && next && next.before === now.before && next.after === now.after;
        return <li key={p.id} className="card upgrade-item">
          <span className="upgrade-rank" aria-label={`Peringkat ${i + 1}`}>{i + 1}</span>
          <Equipment kind={kind(p.id)} size={40} />
          <div className="upgrade-body">
            <h3><span className="mono">{p.id}</span> <span className="muted">jalur {p.line}</span></h3>
            <p>{p.reason}</p>
            {now && next && <p className={`upgrade-effect ${next.before < now.before || next.after < now.after ? "ok" : ""}`}>{same ? "Produksi naik, jumlah constraint dilanggar tidak berubah." : `Constraint dilanggar: rencana awal ${now.before} jadi ${next.before}, rekomendasi ${now.after} jadi ${next.after}.`}</p>}
          </div>
          <div className="upgrade-gain">
            <strong><Icon icon={TrendingUp} size={16} />+{fmt(p.gain)} L/jam</strong>
            <span>{fmt(p.from)} ke {fmt(p.from + p.gain)} L/jam (naik {p.pct}%)</span>
            <span>sekitar +{fmt(p.gain * 8)} L per shift 8 jam</span>
          </div>
          <button type="button" className="button secondary" onClick={() => onTry(p.id, p.pct, p.from + p.gain)}><Icon icon={Plus} size={16} />Terapkan ke rencana</button>
        </li>;
      })}
    </ol> : <p className="card upgrade-empty">Tidak ada upgrade lain yang menambah produksi dengan pengaturan sekarang.</p>}

    {skips.length > 0 && <details className="card upgrade-skips">
      <summary><Icon icon={CircleMinus} size={15} />Tidak disarankan sekarang ({skips.length} alat)</summary>
      <ul>{skips.map(s => <li key={s.id}><strong className="mono">{s.id}</strong> {s.reason}</li>)}</ul>
    </details>}

    <p className="small muted">Dihitung dari pasokan aseptic tank dan kebutuhan mesin filling yang jalan pada snapshot 14.42 [simulasi], ditambah upgrade yang sudah diterapkan ke rencana. Batas kapasitas mesin dari pabrikan belum ada di data, jadi kelayakan teknis upgrade-nya perlu dicek terpisah [asumsi]. Jalur yang sedang CIP atau siaga tidak dihitung.</p>
  </section>;
}
