"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CircleCheck, CircleX, RotateCcw, Save, X } from "lucide-react";
import { scenario } from "@/lib/data";
import { number } from "@/lib/format";
import { setLimits, useDemo } from "@/lib/demo";
import { can } from "@/lib/roles";
import { DEFAULT_LIMITS, evaluate, violations, type ConstraintId, type Limits } from "@/lib/rules";
import { API_MODE, apiSend } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import { Badge, Card, Icon, PageHeading, RoleNote, SectionTitle, SourceButton, SourceModal } from "@/components/ui";

type NumberKey = { [K in keyof Limits]: Limits[K] extends number ? K : never }[keyof Limits];
type ToggleKey = { [K in keyof Limits]: Limits[K] extends boolean ? K : never }[keyof Limits];
type RangeParam = { key: NumberKey; label: string; unit: string; min: number; max: number; step: number; format?: (v: number) => string };
type Param = RangeParam | { key: ToggleKey; label: string; hint: string };
const hm = (v: number) => v % 60 ? `${Math.floor(v / 60)} jam ${v % 60} menit` : `${Math.floor(v / 60)} jam`;

type PlanCheckVerdict = { ok: boolean; text: string };
type PlanCheckResult = {
  before: Record<string, PlanCheckVerdict>;
  after: Record<string, PlanCheckVerdict>;
  violations: { before: number; after: number };
  starvation: { before: number; after: number };
  holdingLeft: number;
};

type SchemaParam = {
  key: keyof Limits;
  kind: "range" | "toggle";
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  default: number | boolean;
  hint?: string;
};

type SchemaItem = {
  id: ConstraintId;
  label: string;
  what: string;
  source: string;
  params: SchemaParam[];
};

type PlanItem = {
  id: string;
  label: string;
  constraints: { id: string; label: string; source: string }[];
};

/** Enam constraint dengan definisi dari materi Greenfields ("Configuration Constraint"). */
const STATIC_CONSTRAINTS: { id: ConstraintId; what: string; params: Param[] }[] = [
  { id: "flow", what: "Kecepatan transfer dan proses membatasi throughput. Lini filling tidak boleh kehabisan pasokan.", params: [
    { key: "maxTransfer", label: "Max transfer rate UHT ke aseptic tank", unit: "L/jam", min: 7_000, max: 12_000, step: 100, format: v => `${number(v)} L/jam` },
    { key: "starvationTol", label: "Toleransi jeda pasokan filling", unit: "menit", min: 0, max: 60, step: 5 },
  ] },
  { id: "maintenance", what: "Waktu siap aset memengaruhi jadwal. Aset dalam maintenance window tidak boleh dipakai.", params: [
    { key: "maintenanceBay3", label: "Uji maintenance window Bay 3, 16.00 - 16.30", hint: "Lihat apakah rencana masih layak bila Bay 3 diservis." },
  ] },
  { id: "holding", what: "Bahan harus diproses dalam batas waktu sebelum masuk tahap berikutnya. Batas ini diperiksa di setiap tahap.", params: [
    { key: "holdingMin", label: "Farm sampai tersimpan dingin", unit: "menit", min: 480, max: 720, step: 10, format: hm },
    { key: "bufferMaxMin", label: "Raw Milk Buffer sampai thermal", unit: "menit", min: 720, max: 1_440, step: 30, format: hm },
  ] },
  { id: "cip", what: "Cleaning, kerusakan, dan stop memotong produksi.", params: [
    { key: "cipBuffer", label: "Jeda setelah CIP bay", unit: "menit", min: 0, max: 30, step: 5 },
    { key: "breakdownF1", label: "Uji breakdown Filling F1, 16.30 - 17.00", hint: "Mensimulasikan mesin rusak di tengah jadwal." },
  ] },
  { id: "tank", what: "Ruang tangki membatasi receiving dan buffer. Tangki penuh atau CIP tidak bisa menerima.", params: [
    { key: "tankMax", label: "Batas level Raw Milk Buffer", unit: "%", min: 85, max: 100, step: 1 },
  ] },
  { id: "changeover", what: "Transisi produk mengikuti SOP: urutan dan waktu cleaning minimum untuk paper, size, dan flavor.", params: [
    { key: "changeoverMax", label: "Changeover maksimum", unit: "per lini per shift", min: 0, max: 4, step: 1 },
  ] },
];

const STATIC_MASTER_CONSTRAINTS = [
  { constraint_id: "MAX_TRANSFER_RATE", category: "THROUGHPUT", scope: "Pipes", description: "Laju transfer maksimum antar aset", parameter_unit: "L/hour", default_value: "X", is_hard_constraint: "Y" },
  { constraint_id: "HOLDING_TIME_LIMIT", category: "QUALITY", scope: "Tanks", description: "Batas waktu simpan susu per tahapan proses", parameter_unit: "hours", default_value: "X", is_hard_constraint: "Y" },
  { constraint_id: "LINE_FILL_SPEED", category: "THROUGHPUT", scope: "Filling_Lines", description: "Kecepatan pengisian kemasan per lini", parameter_unit: "packs/hour", default_value: "X", is_hard_constraint: "Y" },
  { constraint_id: "CIP_DURATION", category: "HYGIENE", scope: "All_Assets", description: "Durasi proses cleaning in place", parameter_unit: "minutes", default_value: "X", is_hard_constraint: "Y" },
  { constraint_id: "CIP_DEDUP_RULE", category: "HYGIENE", scope: "Assets", description: "Penggabungan trigger CIP dalam satu cycle pembersihan", parameter_unit: "boolean", default_value: "TRUE", is_hard_constraint: "Y" },
  { constraint_id: "AT_SAME_PRODUCT", category: "QUALITY", scope: "Aseptic_Tanks", description: "Satu AT hanya boleh melayani produk yang sama pada satu waktu", parameter_unit: "boolean", default_value: "TRUE", is_hard_constraint: "Y" },
  { constraint_id: "FLAVOUR_ISOLATION", category: "QUALITY", scope: "Pipes_Tanks", description: "Isolasi jalur flavour untuk mencegah kontaminasi silang", parameter_unit: "boolean", default_value: "TRUE", is_hard_constraint: "Y" },
  { constraint_id: "MAINTENANCE_WINDOW", category: "OPERATIONAL", scope: "All_Assets", description: "Jendela waktu perawatan preventif mesin", parameter_unit: "hours", default_value: "X", is_hard_constraint: "Y" },
  { constraint_id: "BREAKDOWN_HANDLING", category: "OPERATIONAL", scope: "All_Assets", description: "Prosedur mitigasi saat terjadi unplanned breakdown", parameter_unit: "boolean", default_value: "TRUE", is_hard_constraint: "Y" },
  { constraint_id: "DRAIN_TIME", category: "HYGIENE", scope: "Tanks", description: "Waktu pengurasan sisa produk sebelum CIP", parameter_unit: "minutes", default_value: "X", is_hard_constraint: "Y" },
  { constraint_id: "STERILIZATION_TIME", category: "HYGIENE", scope: "Sterilizers_AT", description: "Waktu sterilisasi sebelum produksi aseptik", parameter_unit: "minutes", default_value: "X", is_hard_constraint: "Y" },
  { constraint_id: "MIN_BATCH_SIZE", category: "PLANNING", scope: "Mixing_Tanks", description: "Ukuran batch minimum untuk proses mixing", parameter_unit: "L", default_value: "X", is_hard_constraint: "N" },
  { constraint_id: "MAX_STORAGE_TIME_RAW", category: "QUALITY", scope: "Raw_Milk_Tanks", description: "Batas waktu simpan susu mentah sebelum termisasi", parameter_unit: "hours", default_value: "X", is_hard_constraint: "Y" },
  { constraint_id: "PASTEURIZATION_TEMP", category: "QUALITY", scope: "Thermizers", description: "Suhu termisasi susu mentah", parameter_unit: "Celsius", default_value: "X", is_hard_constraint: "Y" },
];

function formatValue(key: keyof Limits, unit: string | undefined, v: number): string {
  if (key === "holdingMin" || key === "bufferMaxMin") return hm(v);
  if (key === "maxTransfer") return `${number(v)} L/jam`;
  return `${number(v)} ${unit || ""}`.trim();
}

export function Constraint() {
  const demo = useDemo();
  const [draft, setDraft] = useState<Limits | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const schemaResource = useResource<SchemaItem[]>(API_MODE ? "/limits/schema" : null);
  const plansResource = useResource<PlanItem[]>(API_MODE ? "/plans" : null);
  const masterRules = useResource<{ constraints: Array<{ constraint_id: string; category: string; scope: string; description: string; parameter_unit: string; default_value: string; is_hard_constraint: string }> }>(API_MODE ? "/master/rules" : null);

  const limits = draft ?? demo.limits;
  const allowed = can(demo.role, "constraint.edit");
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(demo.limits);

  const defaultLimits: Limits = schemaResource.data?.length
    ? schemaResource.data.flatMap(c => c.params).reduce((acc, p) => {
        (acc as unknown as Record<string, unknown>)[p.key] = p.default;
        return acc;
      }, {} as Limits)
    : DEFAULT_LIMITS;

  const isDefault = JSON.stringify(limits) === JSON.stringify(defaultLimits);
  const edit = (patch: Partial<Limits>) => setDraft({ ...limits, ...patch });

  const [checkMap, setCheckMap] = useState<Record<string, PlanCheckResult>>({});
  const [checkError, setCheckError] = useState<Error | null>(null);

  useEffect(() => {
    if (!API_MODE || !plansResource.data?.length) return;
    let live = true;
    void Promise.all(
      plansResource.data.map(p =>
        apiSend<PlanCheckResult>("POST", `/plans/${p.id}/check`, limits, demo.role)
          .then(res => [p.id, res] as const)
      )
    )
      .then(entries => {
        if (live) {
          setCheckMap(Object.fromEntries(entries));
          setCheckError(null);
        }
      })
      .catch(err => {
        if (live) setCheckError(err instanceof Error ? err : new Error(String(err)));
      });
    return () => { live = false; };
  }, [plansResource.data, limits, demo.role]);

  if (API_MODE) {
    if (
      (schemaResource.loading && !schemaResource.data && !schemaResource.error) ||
      (plansResource.loading && !plansResource.data && !plansResource.error) ||
      (!schemaResource.data && !schemaResource.error) ||
      (!plansResource.data && !plansResource.error) ||
      (Object.keys(checkMap).length === 0 && !checkError)
    ) {
      return <div className="page-enter" role="status">Memuat data Constraint…</div>;
    }
    const err = schemaResource.error || plansResource.error || checkError;
    if (err) {
      return <div className="page-enter" role="status">Gagal memuat Constraint: {err.message}</div>;
    }
    if (!schemaResource.data?.length || !plansResource.data?.length) {
      return <div className="page-enter" role="status">Tidak ada data constraint tersedia.</div>;
    }
  }

  const constraintsList = API_MODE ? schemaResource.data! : STATIC_CONSTRAINTS;
  const plans = API_MODE ? plansResource.data! : scenario.plans;

  const describe = (from: Limits, to: Limits) => {
    if (API_MODE && schemaResource.data) {
      return schemaResource.data
        .flatMap(c => c.params)
        .filter(p => from[p.key] !== to[p.key])
        .map(p =>
          p.kind === "range"
            ? `${p.label} ${formatValue(p.key, p.unit, from[p.key] as number)} → ${formatValue(p.key, p.unit, to[p.key] as number)}`
            : `${p.label} ${to[p.key] ? "diaktifkan" : "dimatikan"}`
        )
        .join("; ");
    }
    return STATIC_CONSTRAINTS.flatMap(c => c.params)
      .filter(p => from[p.key] !== to[p.key])
      .map(p =>
        "unit" in p
          ? `${p.label} ${p.format ? p.format(from[p.key]) : `${number(from[p.key])} ${p.unit}`} → ${p.format ? p.format(to[p.key]) : `${number(to[p.key])} ${p.unit}`}`
          : `${p.label} ${to[p.key] ? "diaktifkan" : "dimatikan"}`
      )
      .join("; ");
  };

  async function handleSave() {
    if (!draft || saving) return;
    setActionError(null);
    setSaving(true);
    try {
      await setLimits(draft, describe(demo.limits, draft));
      setDraft(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const currentPlanId = plans[0]?.id ?? "current";
  const mockPlan = !API_MODE ? scenario.plans[0] : null;

  return (
    <div className="page-enter">
      <PageHeading title="Constraint" subtitle="Bisakah rencana berjalan sesuai jadwal? Enam constraint diuji pada setiap rencana. Ubah batasnya, lihat dampaknya langsung, lalu simpan.">
        <button className="button secondary" disabled={!allowed || isDefault || saving} onClick={() => setDraft(defaultLimits)}>
          <Icon icon={RotateCcw} size={16} />Nilai awal
        </button>
        <button className="button primary" disabled={!allowed || !dirty || saving} onClick={handleSave}>
          <Icon icon={Save} size={16} />Simpan batas
        </button>
      </PageHeading>
      <RoleNote permission="constraint.edit" />
      {actionError && (
        <div className="decision-banner warn" role="alert">
          <Icon icon={X} />
          <span><strong>Gagal menyimpan batas constraint</strong><span>{actionError}</span></span>
        </div>
      )}
      {dirty && (
        <div className="decision-banner warn" role="status">
          <Icon icon={Save} />
          <span><strong>Perubahan belum disimpan</strong><span>{describe(demo.limits, draft!)}. Pratinjau di bawah sudah memakai nilai baru.</span></span>
        </div>
      )}
      <div className="metrics-grid">
        {plans.flatMap(plan =>
          (["before", "after"] as const).map(view => {
            const n = API_MODE
              ? (checkMap[plan.id]?.violations[view] ?? 0)
              : violations(plan as import("@/mock/types").Plan, view, limits);
            return (
              <Card key={`${plan.id}-${view}`} className="metric-card">
                <span className="metric-label">
                  {plan.id === "current" ? "Rencana shift" : "What-if CIP molor"} · {view === "before" ? "awal" : "rekomendasi"}
                </span>
                <p className="metric-value">{n}<span>dari 6 dilanggar</span></p>
                <Badge tone={n ? "crit" : "ok"}>{n ? "Tidak layak" : "Layak"}</Badge>
              </Card>
            );
          })
        )}
      </div>
      <div className="constraint-grid">
        {constraintsList.map(c => {
          const checks = (["before", "after"] as const).map(view => {
            if (API_MODE) {
              const res = checkMap[currentPlanId]?.[view]?.[c.id];
              return { view, ok: res?.ok ?? true, text: res?.text ?? "" };
            }
            const evalRes = evaluate(mockPlan!, view, limits)[c.id as ConstraintId];
            return { view, ok: evalRes.ok, text: evalRes.text };
          });

          const label = "label" in c ? c.label : scenario.plans[0].constraints.find(x => x.id === c.id)!.label;
          const sourceId = "source" in c ? c.source : scenario.plans[0].constraints.find(x => x.id === c.id)!.source;

          return (
            <Card key={c.id}>
              <SectionTitle title={label} subtitle={c.what} />
              {c.params.map(p => {
                const key = p.key as keyof Limits;
                const isToggle = "kind" in p ? p.kind === "toggle" : !("unit" in p);
                if (!isToggle) {
                  const unit = "unit" in p ? p.unit : "";
                  const min = "min" in p ? p.min : 0;
                  const max = "max" in p ? p.max : 100;
                  const step = "step" in p ? p.step : 1;
                  const currentVal = limits[key] as number;
                  const defVal = defaultLimits[key] as number;
                  const displayCurrent = formatValue(key, unit, currentVal);
                  const displayDef = formatValue(key, unit, defVal);
                  return (
                    <label key={p.key} className="limit-field">
                      <span>
                        {p.label}
                        <small>
                          {displayCurrent}
                          {currentVal !== defVal && ` · awal ${displayDef}`} [asumsi]
                        </small>
                      </span>
                      <input
                        type="range"
                        aria-label={p.label}
                        min={min}
                        max={max}
                        step={step}
                        value={currentVal}
                        disabled={!allowed || saving}
                        onChange={e => edit({ [key]: Number(e.target.value) })}
                        aria-valuetext={displayCurrent}
                      />
                    </label>
                  );
                }
                const hint = "hint" in p ? p.hint : "";
                return (
                  <label key={p.key} className="limit-check">
                    <input
                      type="checkbox"
                      checked={Boolean(limits[key])}
                      disabled={!allowed || saving}
                      onChange={e => edit({ [key]: e.target.checked })}
                    />
                    <span>{p.label}<small>{hint}</small></span>
                  </label>
                );
              })}
              <ul className="verdict-list">
                {checks.map(v => (
                  <li key={v.view} className={`check ${v.ok ? "ok" : "crit"}`}>
                    <Icon icon={v.ok ? CircleCheck : CircleX} size={16} />
                    <span>
                      <strong>{v.view === "before" ? "Rencana awal" : "Rekomendasi"}: {v.ok ? "terpenuhi" : "dilanggar"}</strong>
                      {v.text}
                    </span>
                  </li>
                ))}
              </ul>
              <SourceButton id={sourceId} onSelect={setSource} compact />
            </Card>
          );
        })}
      </div>
      <p className="small muted">
        Pemeriksaan di mockup memakai aturan sederhana pada jadwal skenario. Di prototipe, solver CP-SAT menyusun ulang jadwal dengan batas yang sama.{" "}
        <Link className="inline-link" href="/rencana">
          Lihat dampaknya di Rencana & What-if<Icon icon={ArrowRight} size={12} />
        </Link>
      </p>

      <Card style={{ marginTop: "24px" }}>
        <SectionTitle
          title="Katalog 14 Aturan Pembatas Pabrik (Greenfields v2.1)"
          subtitle="Daftar aturan operasional resmi dari constraint_catalog.csv"
        />
        <div className="table-wrap" style={{ maxHeight: "380px", overflowY: "auto", marginTop: "12px" }}>
          <table>
            <thead>
              <tr>
                <th>ID Aturan</th>
                <th>Kategori</th>
                <th>Cakupan Aset</th>
                <th>Deskripsi Aturan</th>
                <th>Satuan</th>
                <th>Nilai Bawaan</th>
                <th>Tipe Pembatas</th>
              </tr>
            </thead>
            <tbody>
              {(masterRules.data?.constraints ?? STATIC_MASTER_CONSTRAINTS).map(c => (
                <tr key={c.constraint_id}>
                  <td><span className="mono"><strong>{c.constraint_id}</strong></span></td>
                  <td><Badge>{c.category}</Badge></td>
                  <td className="small muted">{c.scope}</td>
                  <td>{c.description}</td>
                  <td className="mono small">{c.parameter_unit}</td>
                  <td><span className="mono">{c.default_value}</span></td>
                  <td>
                    <Badge tone={c.is_hard_constraint === "Y" ? "crit" : "ok"}>
                      {c.is_hard_constraint === "Y" ? "Hard Constraint" : "Soft Constraint"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <SourceModal id={source} onClose={() => setSource(null)} />
    </div>
  );
}

