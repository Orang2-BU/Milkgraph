export type Tone = "ok" | "warn" | "crit" | "neutral";
export interface Source { id: string; time: string; title: string; detail: string; node?: string }
export interface Factor { title: string; text: string; source: string }
export interface Stage { id: string; label: string; count: number; status: string; tone: Tone }
export interface Tanker { id: string; farm: string; volume: number; stage: string; wait: number; age: string; temperature: number; tone: Tone; source: string }
export interface Asset { id: string; kind: "Bay" | "Buffer"; status: string; fill: number; capacity: number; unit: string; info: string; tone: Tone; source: string }
export interface Block { resource: string; label: string; start: number; end: number; type: "unload" | "lab" | "cip" | "process" | "changeover" | "starvation" | "violation"; source: string }
export interface Check { ok: boolean; text: string }
export interface Constraint { id: string; label: string; before: Check; after: Check; source: string }
export interface Plan { id: string; label: string; detail: string; solveTime: string; turnaround: [string, string]; queue: [number, number]; before: Block[]; after: Block[]; constraints: Constraint[]; reasons: Factor[] }
export interface Lot { id: string; product: string; percent: number; packs: number }
export interface Answer { id: string; question: string; template: string; params: string; title: string; conclusion: string; factors: Factor[]; nodes: string[]; edges: string[]; note: string; mix?: { id: string; percent: number }[]; lots?: Lot[] }
export interface Handoff { step: string; from: string; to: string; batch: string; kind: string; window: string; volume: string; record: string; source: string; gap: boolean }
export interface Scenario {
  date: string; now: string; user: { name: string; role: string; initials: string; shift: string };
  metrics: { label: string; value: string; unit: string; delta: string; trend: number[]; source: string }[];
  stages: Stage[]; tankers: Tanker[]; assets: Asset[];
  labHistory: { hour: string; minutes: number }[];
  qcEvent: { lot: string; product: string; test: string; result: string; time: string; source: string };
  holdBaseline: { lots: number; packs: number };
  sources: Source[]; answers: Answer[]; plans: Plan[]; handoffs: Handoff[];
  graph: { nodes: { id: string; type: string; label: string; rank: number; source: string }[]; edges: { id: string; source: string; target: string; label: string; planned?: boolean }[] };
}
