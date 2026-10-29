// Ekspor semua data FE ke mock/fixtures/*.json sebagai seed dan golden test backend (docs/05-INTEGRASI-FE-BE.md).
// Jalankan: pnpm fixtures
import { register } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

register("./ts-hooks.mjs", import.meta.url);
const ops = await import("../mock/ops.ts");
const site = await import("../mock/site.ts");
const rules = await import("../lib/rules.ts");
const roles = await import("../lib/roles.ts");
const scenario = JSON.parse(readFileSync(new URL("../mock/scenario.json", import.meta.url), "utf8"));

const out = new URL("../mock/fixtures/", import.meta.url);
mkdirSync(out, { recursive: true });
const write = (name, data) => writeFileSync(new URL(name, out), JSON.stringify(data, null, 2) + "\n");

const { SOP_CHANGEOVER, DEFAULT_LIMITS, evaluate, violations, instructions, holdingLeft, starvation } = rules;
write("scenario.json", scenario);
write("ops.json", Object.fromEntries(Object.entries(ops).filter(([, v]) => typeof v !== "function")));
write("site.json", { layout: site.SITE, status: site.SITE_STATUS, bottlenecks: site.BOTTLENECKS });
write("roles.json", { roles: roles.ROLES, permissions: roles.PERMISSIONS });
write("limits.json", { defaults: DEFAULT_LIMITS, sopChangeover: SOP_CHANGEOVER });

// Golden: hasil aturan yang WAJIB sama persis di backend untuk input yang sama.
const cases = [
  { name: "default", limits: DEFAULT_LIMITS },
  { name: "holding-620", limits: { ...DEFAULT_LIMITS, holdingMin: 620 } },
  { name: "holding-660", limits: { ...DEFAULT_LIMITS, holdingMin: 660 } },
  { name: "starvation-tol-10", limits: { ...DEFAULT_LIMITS, starvationTol: 10 } },
  { name: "cip-buffer-10", limits: { ...DEFAULT_LIMITS, cipBuffer: 10 } },
  { name: "tank-max-92", limits: { ...DEFAULT_LIMITS, tankMax: 92 } },
  { name: "changeover-max-0", limits: { ...DEFAULT_LIMITS, changeoverMax: 0 } },
  { name: "maintenance-bay3", limits: { ...DEFAULT_LIMITS, maintenanceBay3: true } },
  { name: "max-transfer-8400", limits: { ...DEFAULT_LIMITS, maxTransfer: 8_400 } },
  { name: "buffer-max-900", limits: { ...DEFAULT_LIMITS, bufferMaxMin: 900 } },
  { name: "breakdown-f1", limits: { ...DEFAULT_LIMITS, breakdownF1: true } },
];
write("golden-rules.json", {
  note: "Output lib/rules.ts. Backend /plans/{id}/check harus menghasilkan ok, text, dan violations yang identik untuk setiap kasus.",
  cases: cases.map(({ name, limits }) => ({
    name, limits, holdingLeft: holdingLeft(limits),
    plans: scenario.plans.map(plan => ({
      plan: plan.id,
      before: { checks: evaluate(plan, "before", limits), violations: violations(plan, "before", limits), starvation: starvation(plan.before) },
      after: { checks: evaluate(plan, "after", limits), violations: violations(plan, "after", limits), starvation: starvation(plan.after) },
    })),
  })),
  instructions: Object.fromEntries(scenario.plans.map(plan => [plan.id, instructions(plan)])),
});
console.log("fixtures ditulis ke mock/fixtures/");
