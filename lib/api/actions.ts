import { apiSend } from "./client.ts";

export function createActions(role: () => string, base?: string) {
  const post = (path: string, body: unknown = {}) => apiSend("POST", path, body, role(), base);
  return {
    decidePlan: (id: string, status: string, note: string) => post(`/plans/${encodeURIComponent(id)}/decision`, { status, note }),
    submitHold: (hold: { trigger: string; rt: string; lots: unknown[]; note: string }) => post("/holds", hold),
    reviewHold: (id: string, status: string, note: string) => post(`/holds/${encodeURIComponent(id)}/review`, { status, note }),
    decideLab: (id: string, status: string, note: string) => post(`/lab/results/${encodeURIComponent(id)}/decision`, { status, note }),
    acknowledge: (id: string) => post(`/instructions/${encodeURIComponent(id)}/ack`),
    setLimits: (limits: unknown) => apiSend("PUT", "/limits", limits, role(), base),
    sendDemand: () => post("/supply/demand/send"),
    setRole: (next: string) => post("/session/role", { role: next }),
    resetDemo: () => post("/demo/reset"),
  };
}
