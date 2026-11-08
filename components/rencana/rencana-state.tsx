"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Clock3 } from "lucide-react";
import { Icon, Toggle } from "@/components/ui";
import { scenario } from "@/lib/data";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import type { Adjustments } from "./adjust";

/**
 * State bersama sub halaman Rencana (Rekomendasi upgrade, Alur rencana, Kelayakan & keputusan).
 * Dipasang di app/rencana/layout.tsx, jadi upgrade yang dicoba dan skenario yang dipilih tetap ada saat pindah sub halaman.
 */
export type PlanItem = (typeof scenario.plans)[number] & { resources?: string[]; horizon?: { start: string; end: string }; queueLabel?: string };

type State = {
  plans: PlanItem[] | null;
  plansError: Error | null;
  planId: string; setPlanId: (id: string) => void;
  view: "before" | "after"; setView: (v: "before" | "after") => void;
  adj: Adjustments; setAdj: React.Dispatch<React.SetStateAction<Adjustments>>;
  mode: "2d" | "3d"; setMode: (m: "2d" | "3d") => void;
};

const Ctx = createContext<State | null>(null);

export function RencanaProvider({ children }: { children: ReactNode }) {
  const [planId, setPlanId] = useState("current");
  const [view, setView] = useState<"before" | "after">("before");
  const [adj, setAdj] = useState<Adjustments>({});
  // Poin 14: Alur rencana punya tampilan 2D dan 3D.
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const res = useResource<PlanItem[]>(API_MODE ? "/plans" : null);
  const plans = API_MODE ? res.data ?? null : scenario.plans;
  return <Ctx.Provider value={{ plans, plansError: API_MODE ? res.error ?? null : null, planId, setPlanId, view, setView, adj, setAdj, mode, setMode }}>{children}</Ctx.Provider>;
}

export function useRencana() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRencana dipakai di luar RencanaProvider");
  return c;
}

/** Rencana shift yang sedang berjalan: titik awal Alur rencana, sama dengan kondisi operasional. */
export const BASE_PLAN = "current";

/**
 * Baris di atas Alur rencana dan Kelayakan & keputusan. Pilihan skenario hanya di Kelayakan & keputusan;
 * Alur rencana selalu mulai dari rencana shift berjalan lalu diatur sendiri (revisi 8 Nov poin 6).
 */
export function ScenarioBar({ withMode = false, withScenario = true }: { withMode?: boolean; withScenario?: boolean }) {
  const { plans, planId, setPlanId, setView, mode, setMode } = useRencana();
  const shownId = withScenario ? planId : BASE_PLAN;
  const plan = plans?.find(p => p.id === shownId) ?? plans?.[0];
  const horizon = plan?.horizon ? `Horizon ${plan.horizon.start} - ${plan.horizon.end}` : "Horizon 13.00 - 20.00";
  return <div className="scenario-bar">
    {withScenario && <span className="scenario-pick"><span className="small muted">Skenario</span><Toggle label="Pilih skenario" value={planId} onChange={id => { setPlanId(id); setView("before"); }} options={(plans ?? []).map(p => ({ value: p.id, label: p.label }))} /></span>}
    {withMode && <Toggle label="Jenis tampilan" value={mode} onChange={setMode} options={[{ value: "2d", label: "Alur 2D" }, { value: "3d", label: "Alur 3D" }]} />}
    <span className="small muted"><Icon icon={Clock3} size={15} />{horizon}</span>
  </div>;
}
