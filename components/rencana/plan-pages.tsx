"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/ui";
import type { Plan } from "@/mock/types";
import { PlanFlow } from "./plan-flow";
import { UpgradePicks } from "./upgrade-picks";
import { ScenarioBar, useRencana } from "./rencana-state";

/** Sub halaman Rencana > Rekomendasi upgrade (poin 10). */
export function RencanaUpgrade() {
  const { setAdj } = useRencana();
  const router = useRouter();
  return <div className="page-enter">
    <div className="page-heading"><div><h1>Rekomendasi upgrade</h1><p>Alat mana yang paling menambah produksi bila di-upgrade. Di tiap jalur, alat yang membatasi aliran susu itulah yang layak di-upgrade, diurutkan dari tambahan produksi terbesar.</p></div></div>
    <UpgradePicks onTry={(id, pct, to) => { setAdj(prev => ({ ...prev, [id]: { ...prev[id], upgrade: pct, upgradeTo: to } })); router.push("/rencana/alur"); }} />
  </div>;
}

/** Sub halaman Rencana > Alur rencana (poin 9, 14-17). */
export function RencanaAlur() {
  const { plans, plansError, planId, adj, setAdj, view, setView, mode } = useRencana();
  const plan = plans?.find(p => p.id === planId) ?? plans?.[0];
  return <div className="page-enter">
    <div className="page-heading"><div><h1>Alur rencana</h1><p>Alur produksi mengikuti jadwal rencana. Atur kapasitas atau maintenance alat, lalu lihat efeknya.</p></div></div>
    {!plan ? <p role="status">{plansError ? `Gagal memuat rencana: ${plansError.message}` : "Memuat rencana…"}</p> : <>
      <ScenarioBar withMode />
      <PlanFlow plan={plan as unknown as Plan} adj={adj} setAdj={setAdj} view={view} setView={setView} mode={mode} />
      <div className="card plan-next"><span>Sudah cocok dengan efeknya di alur? Lanjut periksa constraint dan putuskan rencananya.</span><Link className="button primary" href="/rencana">Lanjut ke Kelayakan & keputusan<Icon icon={ArrowRight} size={16} /></Link></div>
    </>}
  </div>;
}
