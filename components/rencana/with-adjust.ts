import { evaluate, transferNeed, type Limits } from "@/lib/rules";
import type { Plan } from "@/mock/types";
import { applyToLimits, type Adjustments } from "./adjust";
import { projectBlocks, projectChecks, type View } from "./projection";

/**
 * Jadwal dan hasil cek constraint satu versi rencana setelah pengaturan alat (upgrade, maintenance) dipasang.
 * Dipakai bersama Rekomendasi upgrade (efek tiap saran) dan Kelayakan & keputusan, supaya angkanya sama dengan Alur rencana.
 */
export function withAdjust(plan: Plan, view: View, adj: Adjustments, limits: Limits) {
  const blocks = projectBlocks(plan[view], transferNeed(view), adj, limits.maxTransfer);
  const checks = projectChecks(evaluate, plan, view, blocks, applyToLimits(limits, adj));
  return { blocks, checks, broken: Object.values(checks).filter(c => !c.ok).length };
}
