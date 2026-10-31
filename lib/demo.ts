"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_LIMITS, type Limits } from "@/lib/rules";
import { ROLES, type RoleId } from "@/lib/roles";
import type { Lot } from "@/mock/types";
import { API_MODE } from "@/lib/api/client";
import { apiGet } from "@/lib/api/client";
import { createActions } from "@/lib/api/actions";
import { mapApiState } from "@/lib/api/demo-state";
import { invalidateResources, onApiEvent, setActiveRole, startEventStream } from "@/lib/api/resource";

export type LogKind = "rencana" | "hold" | "lab" | "constraint" | "instruksi";
export interface LogEntry { id: number; kind: LogKind; title: string; detail: string; note: string; by: string; role: string; at: string; tone: "ok" | "warn" | "crit" | "neutral" }
export interface PlanDecision { plan: string; status: "approved" | "rejected"; note: string; by: string; at: string }
export type HoldStatus = "diajukan" | "aktif" | "ditolak" | "dilepas";
export interface Hold { id: string; trigger: string; rt: string; lots: Lot[]; note: string; status: HoldStatus; by: string; at: string; review?: { note: string; by: string; at: string } }
export interface LabDecision { status: "dirilis" | "ditolak"; note: string; by: string; at: string }
export interface DemoState { v: 1; started: number; role: RoleId; decisions: PlanDecision[]; holds: Hold[]; labs: Record<string, LabDecision>; acks: string[]; limits: Limits; log: LogEntry[] }

const KEY = "milkgraph-demo-v1";
const ROLE_KEY = "milkgraph-api-role";
const initial = (started = 0): DemoState => ({ v: 1, started, role: "planner", decisions: [], holds: [], labs: {}, acks: [], limits: DEFAULT_LIMITS, log: [] });
const SERVER = initial();
let state = SERVER;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return state;
  loaded = true;
  if (API_MODE) {
    try {
      const role = sessionStorage.getItem(ROLE_KEY);
      if (role && role in ROLES) state = { ...state, role: role as RoleId };
    } catch { /* private mode */ }
    setActiveRole(state.role);
    return state;
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as DemoState | null;
    state = saved?.v === 1 ? { ...initial(saved.started), ...saved, limits: { ...DEFAULT_LIMITS, ...saved.limits } } : initial(Date.now());
  } catch { state = initial(Date.now()); }
  return state;
}
function save(next: DemoState) {
  state = next;
  if (!API_MODE) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* mode privat: demo tetap jalan tanpa simpan */ }
  }
  listeners.forEach(fn => fn());
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const actions = createActions(() => load().role);
let loadingApi = false;
export let apiStateError: Error | null = null;
if (API_MODE) {
  onApiEvent(() => { void refreshApiState(); });
}

export async function refreshApiState() {
  if (!API_MODE || loadingApi) return;
  loadingApi = true;
  try {
    const role = load().role;
    const [session, decisions, holds, labs, instructions, limits, audit] = await Promise.all([
      apiGet<{ role: RoleId }>("/session", role),
      apiGet<PlanDecision[]>("/decisions", role),
      apiGet<Hold[]>("/holds", role),
      apiGet<{ id: string; decision?: LabDecision }[]>("/lab/results", role),
      apiGet<{ id: string; ackedBy?: string }[]>("/plans/current/instructions", role),
      apiGet<Limits>("/limits", role),
      apiGet<LogEntry[]>("/audit", role),
    ]);
    save(mapApiState({ role: session.role, decisions, holds, labs, instructions, limits, audit }));
    apiStateError = null;
  } catch (error) {
    apiStateError = error instanceof Error ? error : new Error(String(error));
    listeners.forEach(fn => fn());
  } finally { loadingApi = false; }
}

/** State demo bersama semua halaman, tersimpan di browser. Render server memakai state awal. */
export const useDemo = () => {
  const result = useSyncExternalStore(subscribe, load, () => SERVER);
  useEffect(() => {
    if (API_MODE) {
      void refreshApiState();
      startEventStream();
    }
  }, []);
  return result;
};

/** Jam demo: snapshot 14.42 ditambah menit sungguhan sejak demo dimulai, supaya urutan log masuk akal. */
export function demoClock(s: DemoState = load()) {
  const minutes = 14 * 60 + 42 + Math.max(1, Math.ceil((Date.now() - (s.started || Date.now())) / 60000));
  return `${Math.floor(minutes / 60)}.${String(minutes % 60).padStart(2, "0")}`;
}
export const actor = (s: DemoState) => ({ by: ROLES[s.role].user, role: ROLES[s.role].label });

/** Ubah state dan catat satu baris audit sekaligus. */
function act(change: (s: DemoState, at: string) => Partial<DemoState>, entry?: Omit<LogEntry, "id" | "by" | "role" | "at">) {
  const s = load();
  const at = demoClock(s);
  const next = { ...s, ...change(s, at) };
  if (entry) next.log = [{ ...entry, ...actor(s), at, id: Date.now() }, ...next.log];
  save(next);
}

export const setRole = async (role: RoleId) => {
  if (API_MODE) {
    try { sessionStorage.setItem(ROLE_KEY, role); } catch { /* private mode */ }
    setActiveRole(role);
    state = { ...state, role };
    save(state);
    await actions.setRole(role);
    await refreshApiState();
    invalidateResources();
    return;
  }
  act(() => ({ role }));
};

export const resetDemo = async () => {
  if (API_MODE) {
    await actions.resetDemo();
    await refreshApiState();
    invalidateResources();
    return;
  }
  save(initial(Date.now()));
};

export const decidePlan = async (plan: string, label: string, status: PlanDecision["status"], note: string) => {
  if (API_MODE) {
    const res = await actions.decidePlan(plan, status, note);
    await refreshApiState();
    invalidateResources(["/decisions", "/plans", "/site/status", "/site/bottlenecks", "/receiving", "/audit", "/notifications"]);
    return res;
  }
  act(
    (s, at) => ({ decisions: [{ plan, status, note, by: ROLES[s.role].user, at }, ...s.decisions.filter(d => d.plan !== plan)] }),
    { kind: "rencana", title: `Rekomendasi ${status === "approved" ? "disetujui" : "ditolak"}`, detail: label, note, tone: status === "approved" ? "ok" : "warn" },
  );
};

export const submitHold = async (hold: Pick<Hold, "trigger" | "rt" | "lots" | "note">) => {
  if (API_MODE) {
    const res = await actions.submitHold(hold);
    await refreshApiState();
    invalidateResources(["/holds", "/audit", "/notifications"]);
    return res;
  }
  act(
    (s, at) => ({ holds: [{ ...hold, id: `HOLD-${String(s.holds.length + 1).padStart(3, "0")}`, status: "diajukan", by: ROLES[s.role].user, at }, ...s.holds] }),
    { kind: "hold", title: "Daftar hold diajukan ke QA", detail: `${hold.lots.length} lot dari ${hold.rt}, pemicu ${hold.trigger}`, note: hold.note, tone: "warn" },
  );
};

const HOLD_TITLE: Record<Exclude<HoldStatus, "diajukan">, string> = { aktif: "Hold disetujui QA", ditolak: "Pengajuan hold ditolak", dilepas: "Hold dilepas" };
export const reviewHold = async (id: string, status: Exclude<HoldStatus, "diajukan">, note: string) => {
  if (API_MODE) {
    const res = await actions.reviewHold(id, status, note);
    await refreshApiState();
    invalidateResources(["/holds", "/audit", "/notifications"]);
    return res;
  }
  act(
    (s, at) => ({ holds: s.holds.map(h => h.id === id ? { ...h, status, review: { note, by: ROLES[s.role].user, at } } : h) }),
    { kind: "hold", title: HOLD_TITLE[status], detail: id, note, tone: status === "aktif" ? "crit" : status === "dilepas" ? "ok" : "neutral" },
  );
};

export const decideLab = async (id: string, rt: string, status: LabDecision["status"], note: string) => {
  if (API_MODE) {
    const res = await actions.decideLab(id, status, note);
    await refreshApiState();
    invalidateResources(["/lab/results", "/lab/summary", "/receiving", "/site/status", "/audit"]);
    return res;
  }
  act(
    (s, at) => ({ labs: { ...s.labs, [id]: { status, note, by: ROLES[s.role].user, at } } }),
    { kind: "lab", title: `Hasil lab ${rt} ${status}`, detail: id, note, tone: status === "dirilis" ? "ok" : "crit" },
  );
};

export const acknowledge = async (id: string, title: string) => {
  if (API_MODE) {
    const res = await actions.acknowledge(id);
    await refreshApiState();
    invalidateResources(["/plans", "/audit"]);
    return res;
  }
  act(
    s => ({ acks: [...s.acks, id] }),
    { kind: "instruksi", title: "Instruksi dikonfirmasi", detail: title, note: "", tone: "ok" },
  );
};

export const setLimits = async (limits: Limits, detail: string) => {
  if (API_MODE) {
    const res = await actions.setLimits(limits);
    await refreshApiState();
    invalidateResources(["/limits", "/plans", "/receiving", "/notifications", "/audit"]);
    return res;
  }
  act(() => ({ limits }), { kind: "constraint", title: "Batas constraint diubah", detail, note: "", tone: "neutral" });
};

export const sendDemand = async (detail: string) => {
  if (API_MODE) {
    const res = await actions.sendDemand();
    await refreshApiState();
    invalidateResources(["/supply/demand-sends", "/audit"]);
    return res;
  }
  act(() => ({}), { kind: "rencana", title: "Kebutuhan susu dikirim ke farm", detail, note: "", tone: "ok" });
};
