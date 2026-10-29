"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LIMITS, type Limits } from "@/lib/rules";
import { ROLES, type RoleId } from "@/lib/roles";
import type { Lot } from "@/mock/types";

export type LogKind = "rencana" | "hold" | "lab" | "constraint" | "instruksi";
export interface LogEntry { id: number; kind: LogKind; title: string; detail: string; note: string; by: string; role: string; at: string; tone: "ok" | "warn" | "crit" | "neutral" }
export interface PlanDecision { plan: string; status: "approved" | "rejected"; note: string; by: string; at: string }
export type HoldStatus = "diajukan" | "aktif" | "ditolak" | "dilepas";
export interface Hold { id: string; trigger: string; rt: string; lots: Lot[]; note: string; status: HoldStatus; by: string; at: string; review?: { note: string; by: string; at: string } }
export interface LabDecision { status: "dirilis" | "ditolak"; note: string; by: string; at: string }
export interface DemoState { v: 1; started: number; role: RoleId; decisions: PlanDecision[]; holds: Hold[]; labs: Record<string, LabDecision>; acks: string[]; limits: Limits; log: LogEntry[] }

const KEY = "milkgraph-demo-v1";
const initial = (started = 0): DemoState => ({ v: 1, started, role: "planner", decisions: [], holds: [], labs: {}, acks: [], limits: DEFAULT_LIMITS, log: [] });
const SERVER = initial();
let state = SERVER;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return state;
  loaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as DemoState | null;
    state = saved?.v === 1 ? { ...initial(saved.started), ...saved, limits: { ...DEFAULT_LIMITS, ...saved.limits } } : initial(Date.now());
  } catch { state = initial(Date.now()); }
  return state;
}
function save(next: DemoState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* mode privat: demo tetap jalan tanpa simpan */ }
  listeners.forEach(fn => fn());
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** State demo bersama semua halaman, tersimpan di browser. Render server memakai state awal. */
export const useDemo = () => useSyncExternalStore(subscribe, load, () => SERVER);

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

export const setRole = (role: RoleId) => act(() => ({ role }));
export const resetDemo = () => save(initial(Date.now()));

export const decidePlan = (plan: string, label: string, status: PlanDecision["status"], note: string) => act(
  (s, at) => ({ decisions: [{ plan, status, note, by: ROLES[s.role].user, at }, ...s.decisions.filter(d => d.plan !== plan)] }),
  { kind: "rencana", title: `Rekomendasi ${status === "approved" ? "disetujui" : "ditolak"}`, detail: label, note, tone: status === "approved" ? "ok" : "warn" },
);

export const submitHold = (hold: Pick<Hold, "trigger" | "rt" | "lots" | "note">) => act(
  (s, at) => ({ holds: [{ ...hold, id: `HOLD-${String(s.holds.length + 1).padStart(3, "0")}`, status: "diajukan", by: ROLES[s.role].user, at }, ...s.holds] }),
  { kind: "hold", title: "Daftar hold diajukan ke QA", detail: `${hold.lots.length} lot dari ${hold.rt}, pemicu ${hold.trigger}`, note: hold.note, tone: "warn" },
);

const HOLD_TITLE: Record<Exclude<HoldStatus, "diajukan">, string> = { aktif: "Hold disetujui QA", ditolak: "Pengajuan hold ditolak", dilepas: "Hold dilepas" };
export const reviewHold = (id: string, status: Exclude<HoldStatus, "diajukan">, note: string) => act(
  (s, at) => ({ holds: s.holds.map(h => h.id === id ? { ...h, status, review: { note, by: ROLES[s.role].user, at } } : h) }),
  { kind: "hold", title: HOLD_TITLE[status], detail: id, note, tone: status === "aktif" ? "crit" : status === "dilepas" ? "ok" : "neutral" },
);

export const decideLab = (id: string, rt: string, status: LabDecision["status"], note: string) => act(
  (s, at) => ({ labs: { ...s.labs, [id]: { status, note, by: ROLES[s.role].user, at } } }),
  { kind: "lab", title: `Hasil lab ${rt} ${status}`, detail: id, note, tone: status === "dirilis" ? "ok" : "crit" },
);

export const acknowledge = (id: string, title: string) => act(
  s => ({ acks: [...s.acks, id] }),
  { kind: "instruksi", title: "Instruksi dikonfirmasi", detail: title, note: "", tone: "ok" },
);

export const setLimits = (limits: Limits, detail: string) => act(() => ({ limits }), { kind: "constraint", title: "Batas constraint diubah", detail, note: "", tone: "neutral" });

export const sendDemand = (detail: string) => act(() => ({}), { kind: "rencana", title: "Kebutuhan susu dikirim ke farm", detail, note: "", tone: "ok" });
