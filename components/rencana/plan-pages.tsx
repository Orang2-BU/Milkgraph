"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui";
import type { Plan } from "@/mock/types";
import { PlanFlow } from "./plan-flow";
import { UpgradePicks } from "./upgrade-picks";
import { ScenarioBar, useRencana } from "./rencana-state";

/**
 * Sub halaman Rencana berurutan (poin 9 dan 10): 1. Alur rencana (tampilan awal, sama dengan operasi),
 * 2. Rekomendasi upgrade, 3. Kelayakan & keputusan. Tiap halaman diakhiri tombol ke langkah berikutnya.
 */
function NextStep({ text, href, label, skip }: { text: string; href: string; label: string; skip?: { href: string; label: string } }) {
  return <div className="card plan-next">
    <span>{text}</span>
    <span className="plan-next-actions">
      {skip && <Link className="text-link" href={skip.href}>{skip.label}</Link>}
      <Link className="button primary" href={href}>{label}<Icon icon={ArrowRight} size={16} /></Link>
    </span>
  </div>;
}

/** Langkah 1: Alur rencana (poin 9, 14-17). */
export function RencanaAlur() {
  const { plans, plansError, planId, adj, setAdj, view, setView, mode } = useRencana();
  const plan = plans?.find(p => p.id === planId) ?? plans?.[0];
  return <div className="page-enter">
    <div className="page-heading"><div><h1>Alur rencana</h1><p>Alur produksi mengikuti jadwal rencana, mulai dari kondisi operasi sekarang. Atur kapasitas atau maintenance alat, lalu lihat efeknya.</p></div></div>
    {!plan ? <p role="status">{plansError ? `Gagal memuat rencana: ${plansError.message}` : "Memuat rencana…"}</p> : <>
      <ScenarioBar withMode />
      <PlanFlow plan={plan as unknown as Plan} adj={adj} setAdj={setAdj} view={view} setView={setView} mode={mode} />
      <NextStep text="Sudah melihat masalahnya di alur? Berikutnya, lihat upgrade alat yang paling menambah produksi." href="/rencana/upgrade" label="Lanjut ke Rekomendasi upgrade" skip={{ href: "/rencana", label: "Langsung ke Kelayakan & keputusan" }} />
    </>}
  </div>;
}

/** Langkah 2: Rekomendasi upgrade (poin 10). Upgrade diterapkan di sini, efeknya langsung terlihat tanpa pindah halaman. */
export function RencanaUpgrade() {
  const { setAdj } = useRencana();
  return <div className="page-enter">
    <div className="page-heading"><div><h1>Rekomendasi upgrade</h1><p>Alat mana yang paling menambah produksi bila di-upgrade, diurutkan dari tambahan terbesar. Terapkan ke rencana untuk melihat efeknya ke constraint.</p></div></div>
    <UpgradePicks onTry={(id, pct, to) => { setAdj(prev => ({ ...prev, [id]: { ...prev[id], upgrade: pct, upgradeTo: to } })); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
    <NextStep text="Berikutnya, periksa constraint dan putuskan rencananya. Upgrade yang diterapkan ikut dihitung." href="/rencana" label="Lanjut ke Kelayakan & keputusan" />
  </div>;
}
