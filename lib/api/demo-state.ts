import type { DemoState, LabDecision, PlanDecision, Hold, LogEntry } from "../demo";
import type { Limits } from "../rules";
import type { RoleId } from "../roles";

export function mapApiState(parts: {
  role: RoleId;
  decisions: PlanDecision[];
  holds: Hold[];
  labs: { id: string; decision?: LabDecision }[];
  instructions: { id: string; ackedBy?: string }[];
  limits: Limits;
  audit: LogEntry[];
}): DemoState {
  return {
    v: 1, started: 0, role: parts.role,
    decisions: parts.decisions, holds: parts.holds,
    labs: Object.fromEntries(parts.labs.filter(item => item.decision).map(item => [item.id, item.decision!])),
    acks: parts.instructions.filter(item => item.ackedBy).map(item => item.id),
    limits: parts.limits, log: parts.audit,
  };
}
