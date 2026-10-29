# 04 — API CONTRACT: MilkGraph `/api/v1`

> Kontrak antara frontend (repo ini) dan backend FastAPI. Setiap tipe di sini **sudah ada di kode FE** dan dipakai layar apa adanya; path file disebut di setiap bagian. Contoh nilai diambil dari `mock/fixtures/*.json` (hasil `pnpm fixtures`), jadi backend bisa langsung mencocokkan. Diperbarui 29 Okt 2026.

## 1. Aturan umum

### 1.1 Dasar

- Base URL: `${API_URL}/api/v1`. JSON UTF-8. Nama field **camelCase, identik dengan tipe TypeScript**.
- Respons GET mengembalikan payload langsung (tanpa amplop).
- Respons tulis (POST/PUT) selalu: `{ "result": <resource>, "log": <LogEntry> }`.
- Backend **boleh menambah** field baru (FE mengabaikan). Backend **tidak boleh** mengganti nama, tipe, atau menghapus field yang ada di dokumen ini. Perubahan yang merusak = `/api/v2`.
- `GET /meta` mengembalikan `schemaVersion: "1"`; FE memeriksa nilai ini saat start.

### 1.2 Autentikasi dan peran

| Mode | Header | Keterangan |
|---|---|---|
| `demo` | `X-Demo-Role: planner \| receiving \| supervisor \| qa` | Pengganti kartu akun; tanpa password |
| `live` | `Authorization: Bearer <jwt>` (claim `role`, `name`) | `X-Demo-Role` ditolak 400 |

Tanpa peran valid → `401`. Peran tidak berizin → `403` dengan `message` persis teks `whoCan(permission)` dari `lib/roles.ts`, contoh: `"Hanya QA/Lab yang dapat melakukan ini."`.

### 1.3 Error

```json
{ "error": { "code": "VALIDATION", "message": "Catatan wajib diisi untuk penolakan.", "field": "note" } }
```

| HTTP | `code` | Kapan |
|---|---|---|
| 400 | `BAD_REQUEST` | JSON rusak, header mode salah |
| 401 | `UNAUTHENTICATED` | Tidak ada peran |
| 403 | `FORBIDDEN` | Peran tidak berizin |
| 404 | `NOT_FOUND` | ID tidak ada |
| 409 | `CONFLICT` | Keputusan sudah ada, hold aktif untuk pemicu yang sama, kebutuhan sudah dikirim hari ini |
| 422 | `VALIDATION` | Field tidak valid; `field` diisi |
| 500 | `INTERNAL` | |

### 1.4 Format nilai

| Jenis | Format di kontrak | Contoh |
|---|---|---|
| Jam tampilan | `"HH.MM"` 24 jam, WIB | `"14.42"`, `"15.20"` |
| Tanggal + jam tampilan | `"D Mmm HH.MM"`, bulan singkatan Indonesia | `"13 Okt 22.40"` |
| Durasi tampilan | `"Hj MMm"` | `"9j 20m"`, `"1j 10m"` |
| Rentang | `"HH.MM - HH.MM"` (spasi, tanda minus) | `"14.10 - 15.20"` |
| Angka di teks | pemisah ribuan titik, desimal koma | `"10.200 L/jam"`, `"3,8 °C"` |
| Angka numerik | number JSON biasa | `10200`, `3.8` |
| Menit Gantt | integer menit sejak `horizon.start` | `start: 135` = 15.15 |
| Waktu mentah tambahan | ISO 8601 `+07:00` (boleh ditambah sebagai field baru, mis. `atIso`) | `"2026-10-14T14:42:00+07:00"` |

Semua teks UI berbahasa Indonesia; tidak memakai em-dash.

### 1.5 Format ID

| Entitas | Pola | Contoh |
|---|---|---|
| Road Tanker | `RT-NN` | `RT-26` |
| Hasil lab | `LAB-NNNN` | `LAB-9031` |
| Lot barang jadi | `FG-MMDD-NN` | `FG-1013-07` |
| Hold | `HOLD-NNN` (urut, diberi backend) | `HOLD-001` |
| Surat jalan | `SJ-FFF-MMDD-NN` (FFF = kode farm) | `SJ-NGD-1013-04` |
| Raw milk batch | `RMB-MMDD-NN` | `RMB-1013-02` |
| Batch storage / mixing / premix / cream | `STB-` / `MXB-` / `PMX-` / `CRB-MMDD-NN` | `STB-1013-04` |
| Instruksi | `{planId}:{RT-NN atau F2}` | `current:RT-26`, `current:F2` |
| Sumber bukti | huruf besar + angka bebas | `WB-26`, `CIP-B2`, `TR-ST4` |
| Aset | `Bay N`, `RMT-N`, `ST-N`, `CT-N`, `PM-N`, `MX-N`, `UHT-N`, `AT-N`, `FN` | `AT-2`, `F4` |

## 2. Meta, sesi, shell

| Method | Path | Respons | Izin | Dipakai di |
|---|---|---|---|---|
| GET | `/meta` | `Meta` | publik | semua (start) |
| GET | `/session` | `Session` | semua peran | shell (kartu akun, avatar) |
| POST | `/session/role` | `{ result: Session, log: null }` | demo saja | shell panel "Masuk sebagai", `/pengguna` |
| GET | `/roles` | `{ roles: Record<RoleId, Role>, permissions: Record<Permission, {label, roles}> }` | semua | `/pengguna`, `RoleNote` |
| GET | `/shifts` | `Shift[]` | semua | panel "Pilih shift" |
| GET | `/notifications` | `Notification[]` | semua | panel notifikasi + badge angka |
| GET | `/sources` | `Source[]` | semua | `SourceModal`, chip sumber |
| GET | `/sources/{id}` | `Source` | semua | `SourceModal` |
| POST | `/demo/reset` | `{ result: { ok: true }, log: null }` | demo saja | "Atur ulang demo" |

```ts
// Tipe baru (belum ada di FE, ditambahkan FE saat integrasi)
interface Meta { schemaVersion: "1"; mode: "demo" | "live"; date: string /* "Rabu, 14 Oktober 2026" */; now: string /* "14.42" */; horizon: { start: string /* "13.00" */; end: string /* "20.00" */; nowOffset: number /* 102 */ }; snapshotLabel: string /* "Snapshot 14.42 WIB" */ }
interface Session { user: { name: string; role: string; initials: string; shift: string }; role: RoleId; permissions: Permission[] }
interface Shift { id: string; label: string /* "Shift Siang" */; window: string /* "14.00 - 22.00" */; date: string /* "Rab 14 Okt" */; selected: boolean; available: boolean }
interface Notification { id: string; title: string; subtitle: string; sourceId: string; tone: Tone }
// Sudah ada: Role (lib/roles.ts ROLES value), Source (mock/types.ts)
```

`Notification` minimal yang harus muncul pada skenario: `PLAN-FIFO` ("Rencana shift tidak layak", subjudul memakai jumlah pelanggaran dari `/plans/current/check`), `HOLD-RT26` ("RT-26 mendekati batas holding time", "Tersisa 1j 10m · menunggu bay"), `LAB-8812` ("QC FG out-of-spec FG-1013-07", "Residu antibiotik · jalankan trace").

## 3. Receiving Flow (`/`)

| Method | Path | Respons |
|---|---|---|
| GET | `/receiving` | `ReceivingView` |

```ts
interface ReceivingView {
  metrics: { label: string; value: string; unit: string; delta: string; trend: number[]; source: string }[]; // 4 item, urutan: throughput, waktu putar, tunggu lab, bay aktif
  stages: Stage[];        // 7 tahap: Farms, On the way, Sampling, Lab test, Released, Unloading, Stored
  tankers: Tanker[];      // RT di plant
  assets: Asset[];        // Bay 1-3 + RMT-1..3
  labHistory: { hour: string; minutes: number }[]; // per jam, item terakhir = jam ini
  labSummary: { avgMinutes: number /* 52 */; deltaMinutes: number /* 14 */; waiting: number /* 3 */; sourceId: "LAB-QUEUE" };
  incident: { planId: "current"; rt: string /* "RT-26" */; holdingLeftMin: number /* 70 */; summary: string /* "Antrean RT menumpuk karena lab test lama dan Bay 2 sedang CIP." */; factors: { label: string; sourceId: string }[] }; // kartu sorotan
}
```

- `stages[].count` untuk Sampling, Lab test, Released, Unloading **harus sama** dengan jumlah `tankers` di tahap itu (diuji `tests/scenario.test.mjs`).
- Rata-rata `wait` RT di tahap Lab test = `labSummary.avgMinutes` (52).
- `incident.holdingLeftMin` = `limits.holdingMin − umur RT kritis` (lihat §6.3); FE menampilkan sebagai `"1j 10m"`.
- `incident.factors` default: `[{label:"Lab test 52 menit", sourceId:"LAB-QUEUE"}, {label:"Bay 2 CIP sampai 15.20", sourceId:"CIP-B2"}, {label:"Holding time RT-26", sourceId:"HOLD-RT26"}]`.
- Judul kartu ("Rencana tidak layak, N constraint dilanggar" / "Rekomendasi disetujui, RT-26 pindah ke Bay 1") disusun FE dari `/plans/current/check` dan `/decisions`.

## 4. Bay & Tangki (`/tangki`), Lini Filling (`/filling`)

| Method | Path | Respons | Tipe FE |
|---|---|---|---|
| GET | `/assets` | `Asset[]` (Bay + Buffer) | `mock/types.ts` `Asset` |
| GET | `/assets/cip-log` | `CipRecord[]` | `mock/ops.ts` |
| GET | `/assets/cip-policy` | `{ tankIntervalHours: number /* 24 [asumsi] */ }` | teks "Batas antar-CIP tangki" di `tangki.tsx` |
| GET | `/assets/mid-tanks` | `MidTank[]` (ST-1..6, CT-1..3, PM-3, MX-1..2) | `mock/ops.ts` |
| GET | `/production/aseptic-tanks` | `AsepticTank[]` (AT-1..5) | `mock/ops.ts` |
| GET | `/production/fillers` | `Filler[]` (F1..F10) | `mock/ops.ts` |
| GET | `/production/unit-states` | `Record<UnitState, {label, tone}>` | `UNIT_STATE` |
| GET | `/production/changeover-matrix` | `{ products: string[]; minutes: number[][]; note: string }` | `changeoverMatrix` |
| GET | `/plans/{planId}/instructions` | `InstructionView[]` | `lib/rules.ts` `Instruction` + ack |
| POST | `/instructions/{id}/ack` | `{ result: InstructionView, log }` | aksi `acknowledge` |

```ts
interface InstructionView extends Instruction { ackedBy?: string; ackedAt?: string }  // Instruction: { id, role: "receiving"|"supervisor", text, from }
```

Aturan:
- `AsepticTank.inflow.before/after` = laju masuk L/jam pada tampilan rencana awal / rekomendasi. FE menghitung `need` = jumlah `Filler.litres` lini yang `state === "jalan"` dan jam kosong = `NOW + level / (need − inflow) × 60` menit. Backend boleh menambah `emptyAt` jadi, tetapi field yang ada wajib tetap.
- Setiap AT melayani tepat 2 filler (`fillers` berisi 2 ID). AT-2 = F2 + F4.
- `/plans/{planId}/instructions` kosong (`[]`) bila rencana belum disetujui. Setelah `current` disetujui: 5 instruksi `receiving` (RT-24, RT-26, RT-27, RT-28, RT-29) + 1 `supervisor` (`current:F2`), urutan sama dengan `golden-rules.json → instructions.current`.
- `POST /instructions/{id}/ack`: izin `instruction.ack` **dan** `session.role === instruction.role` (receiving tidak boleh konfirmasi instruksi supervisor). Konfirmasi kedua → 409. Audit: `kind "instruksi"`, `title "Instruksi dikonfirmasi"`, `detail` = `text`, `tone "ok"`. Event `instruction.acked`.

## 5. Rencana & What-if (`/rencana`), Constraint (`/constraint`)

| Method | Path | Body | Respons | Izin |
|---|---|---|---|---|
| GET | `/plans` | | `PlanView[]` | semua |
| GET | `/plans/{planId}` | | `PlanView` | semua |
| POST | `/plans/{planId}/check` | `{ limits?: Limits }` (kosong = limit tersimpan) | `CheckResult` | semua (pratinjau Constraint memakai body) |
| POST | `/plans/{planId}/solve` | `{ limits?: Limits }` | `{ result: PlanView, log }` | `plan.decide` |
| GET | `/decisions` | | `PlanDecision[]` | semua |
| POST | `/plans/{planId}/decision` | `{ status: "approved" \| "rejected", note: string }` | `{ result: PlanDecision, log }` | `plan.decide` |
| GET | `/limits` | | `Limits` | semua |
| GET | `/limits/schema` | | `LimitSchema` | semua |
| PUT | `/limits` | `Limits` | `{ result: Limits, log }` | `constraint.edit` |

```ts
interface PlanView extends Plan { resources: string[] /* ["Lab test","Bay 1","Bay 2","Bay 3","Filling F1","Filling F2","Filling F4"] */; horizon: { start: "13.00"; end: "20.00" }; queueLabel: string /* "RT antre di plant 16.00" */ }
// Plan (mock/types.ts): { id, label, detail, solveTime, turnaround:[string,string], queue:[number,number], before: Block[], after: Block[], constraints: Constraint[], reasons: Factor[] }
// Block: { resource, label, start, end, type: "unload"|"lab"|"cip"|"process"|"changeover"|"starvation"|"violation", source }
interface CheckResult {
  before: Record<ConstraintId, Check>; after: Record<ConstraintId, Check>;   // Check = { ok: boolean; text: string }
  violations: { before: number; after: number };
  starvation: { before: number; after: number };                            // menit, lini terburuk
  holdingLeft: number;                                                       // menit
}
// ConstraintId = "flow" | "maintenance" | "holding" | "cip" | "tank" | "changeover"
// Limits (lib/rules.ts): { maxTransfer, starvationTol, maintenanceBay3, holdingMin, bufferMaxMin, cipBuffer, breakdownF1, tankMax, changeoverMax }
interface LimitSchema { id: ConstraintId; label: string; what: string; source: string; params: ({ key: keyof Limits; kind: "range"; label: string; unit: string; min: number; max: number; step: number; default: number } | { key: keyof Limits; kind: "toggle"; label: string; hint: string; default: boolean })[] }[]
```

Aturan:
- `plan.id`: `current` (Rencana shift FIFO) dan `cip-molor` (What-if: CIP Bay 2 molor 40 menit). `before` = rencana awal, `after` = rekomendasi solver.
- `Plan.constraints[].before/after` di mock adalah teks lama; **sumber kebenaran tampilan adalah `CheckResult`**. `Plan.constraints` tetap dikirim untuk `id`, `label`, `source`.
- `CheckResult` untuk input yang sama **wajib identik** dengan `mock/fixtures/golden-rules.json` (termasuk teks). Default: `current` dan `cip-molor` → `violations.before = 3`, `violations.after = 0`.
- `POST /plans/{id}/decision`: `note` maks 500 karakter; `rejected` wajib `note` tidak kosong (422 `field: "note"`); sudah ada keputusan untuk plan di shift ini → 409. Audit `kind "rencana"`, `title "Rekomendasi disetujui"` / `"Rekomendasi ditolak"`, `detail` = `plan.label`, `tone "ok"`/`"warn"`. Event `plan.decided`. Efek samping: `approved` pada `current` menerbitkan instruksi (§4) dan mengubah `/site/status?view=` aktif.
- `PUT /limits`: validasi `min/max/step` dari `/limits/schema`. Audit `kind "constraint"`, `title "Batas constraint diubah"`, `detail` = daftar perubahan dipisah `"; "`, format per item: `"{label} {lama} → {baru}"` untuk range (nilai diformat seperti di UI, mis. `"Farm sampai tersimpan dingin 10j 30m → 10j 20m"`) dan `"{label} diaktifkan|dimatikan"` untuk toggle. Event `limits.updated`.
- Nilai default `Limits` dan `LimitSchema` ada di `mock/fixtures/limits.json` dan `components/constraint/constraint.tsx` (`CONSTRAINTS`).

## 6. Rules: algoritma yang harus diport

Sumber: `lib/rules.ts`, test: `tests/rules.test.mjs`, golden: `mock/fixtures/golden-rules.json`.

### 6.1 Konstanta yang di mock masih tetap (backend menghitung dari data)

| Konstanta FE | Nilai mock | Arti | Dihitung backend dari |
|---|---|---|---|
| `NOW` | 102 | menit snapshot sejak 13.00 | `meta.horizon.nowOffset` |
| `RT26_AGE` | 560 | umur susu RT kritis saat snapshot (menit) | jam muat di farm (surat jalan) sampai snapshot; RT kritis = umur + sisa antre terbesar |
| `FACTS.before/after.finish` | 195 / 170 | jam selesai bongkar RT kritis (menit) | blok `unload`/`violation` RT itu di plan view; untuk blok `violation`, jam selesai riil setelah konflik diselesaikan simulator |
| `FACTS.*.transfer` | 10.200 / 8.540 | laju UHT ke AT-2 yang dibutuhkan (L/jam) | simulator: laju agar level AT-2 tidak 0 di horizon |
| `FACTS.*.bufferAge` | 970 / 905 | umur susu tertua di RMT-2 saat masuk thermal (menit) | time-series level + transfer |
| `FACTS.*.tankPeak` | 91 / 94 | puncak level Raw Milk Buffer (%) | proyeksi level horizon |
| `MAINTENANCE` | Bay 3, 180-210 | jendela uji maintenance | tabel maintenance window (toggle `maintenanceBay3` hanya untuk uji) |
| `BREAKDOWN` | Filling F1, 210-240 | jendela uji breakdown | event breakdown (toggle `breakdownF1` hanya untuk uji) |
| `LINES` | F1, F2, F4 | lini dalam rencana | `PlanView.resources` yang diawali `Filling` |
| `SOP_CHANGEOVER` | matriks 6 transisi | menit minimum per transisi | `/production/changeover-matrix` |

### 6.2 Enam cek

1. **flow** (Flow rate): `starved` = total menit blok `starvation` di lini terburuk. `ok = transfer ≤ maxTransfer && starved ≤ starvationTol`. Teks lihat golden.
2. **maintenance**: bila jendela maintenance aktif, blok `unload`/`violation` yang tumpang tindih di aset itu = pelanggaran.
3. **holding**: `left = holdingMin − (umur RT kritis + finish − NOW)`; dan `bufferAge ≤ bufferMaxMin`. `ok` bila keduanya terpenuhi. Teks = kalimat RT + kalimat buffer.
4. **cip** (Downtime & CIP): blok `unload`/`violation` berlabel RT yang tumpang tindih `[cip.start, cip.end + cipBuffer)` di aset sama = pelanggaran; plus breakdown yang memotong blok non-starvation lini F1 bila aktif.
5. **tank**: `tankPeak ≤ tankMax`.
6. **changeover** (SOP): jumlah changeover per lini ≤ `changeoverMax` **dan** durasi tiap changeover ≥ `SOP_CHANGEOVER["{produk sebelum}>{produk sesudah}"]`.

`violations` = jumlah cek `ok: false`. `instructions(plan)` = setiap blok `unload` berlabel RT di `after` yang bay atau jam mulainya berbeda dari `before` → instruksi `receiving`; bila starvation `before > after` → satu instruksi `supervisor` id `{plan}:F2`.

### 6.3 Turunan yang dipakai halaman lain

- `holdingLeft(limits)` = `holdingMin − umur RT kritis` → Receiving (sisa holding) dan notifikasi.
- `starvation(blocks)` → kartu Gantt Filling dan metrik Rencana.

## 7. Pasokan & Permintaan (`/pasokan`)

| Method | Path | Respons |
|---|---|---|
| GET | `/supply/farms` | `Farm[]` |
| GET | `/supply/demand-plan` | `{ lines: DemandLine[]; processLoss: number /* 0.03 */; capacityTonPerDay: 320; capacityL: number /* 310680 */; milkDensity: 1.03 }` |
| GET | `/supply/trend` | `{ months: string[]; demand: number[]; incoming: number[]; capacity: number }` |
| GET | `/supply/demand-sends?date=` | `{ sent: boolean; at?: string; by?: string; detail?: string }` |
| POST | `/supply/demand/send` | `{ result: { sent: true, at, by, detail }, log }` |

- Kebutuhan susu = `Σ round(packs × litresPerPack × milk) / (1 − processLoss)` → skenario 278.659 L; rencana kirim farm = `Σ plannedL` = 310.800 L; kapasitas 310.680 L.
- `POST /supply/demand/send`: izin `demand.send`; sekali per tanggal (409). Audit `kind "rencana"`, `title "Kebutuhan susu dikirim ke farm"`, `detail` = `"{kebutuhan} L untuk {n} SKU, {rt} RT dari {farm} farm"`, `tone "ok"`. Event `demand.sent`.
- `trend` di mock berlabel `[simulasi]`; backend mengisi dari data permintaan dan rencana susu masuk nyata bila tersedia.

## 8. Traceability (`/trace`), asisten

| Method | Path | Body / query | Respons |
|---|---|---|---|
| GET | `/quality/active-event` | | `QcEvent` (`{ lot, product, test, result, time, source }`) |
| GET | `/assistant/templates` | | `{ id: string; question: string }[]` (pertanyaan contoh di kartu "Tanya graph") |
| POST | `/assistant/ask` | `{ question: string }` | `Answer` atau `{ id: "unknown", question }` |
| GET | `/trace/backward` | `?lotId=FG-1013-07` | `Answer` (id `backward`) |
| GET | `/trace/forward` | `?rtId=RT-04&date=2026-10-13` | `Answer` (id `forward`) |
| GET | `/trace/explain` | `?resource=Bay 2&time=14.50` | `Answer` (id `bay2`) |
| GET | `/trace/handoffs` | `?lotId=FG-1013-07` | `Handoff[]` |
| GET | `/lots/locations` | `?ids=FG-1013-05,FG-1013-06` | `Record<string, { place: string; shipped: boolean }>` |
| GET | `/holds/summary` | | `{ baseline: { lots: number; packs: number } }` (14 lot, 101.200 pak) |

```ts
// Answer (mock/types.ts): { id, question, template, params, title, conclusion, factors: Factor[], nodes: string[], edges: string[], note, mix?: {id, percent}[], lots?: Lot[] }
// Field baru: subjectRt?: string  → RT kandidat (backward) atau RT sumber (forward), mis. "RT-04"; dipakai tabel, dialog hold, dan POST /holds
// Handoff: { step, from, to, batch, kind, window, volume, record, source, gap }
```

Template terdaftar (LLM hanya boleh memilih salah satu dan mengisi parameter):

| Template | Parameter | Kapan dipilih |
|---|---|---|
| `trace_backward` | `lot_id` | asal lot, "berasal dari", lot FG |
| `trace_forward` | `rt_id`, `tanggal` | lot apa saja yang mengandung susu RT |
| `explain_resource` | `resource`, `waktu` | kenapa aset tidak bisa dipakai |

- `Answer.template` + `Answer.params` ditampilkan sebagai `trace_backward(lot_id = FG-1013-07)`; format params `"nama = nilai, nama = nilai"`.
- `nodes`/`edges` = ID dari `GET /graph` yang membentuk jalur bukti (FE menyorotnya).
- `mix` (backward) berjumlah 100. `lots` (forward) diurutkan ID; `lots[].percent` untuk lot pemicu = `mix` RT kandidat (diuji `scenario.test.mjs`).
- Tidak ada template cocok → `{ "id": "unknown", "question": "..." }`, HTTP 200. **Tidak boleh menebak.**
- Pemetaan kata kunci di `components/trace/trace.tsx` `ask()` hanya tiruan; logika ini pindah ke backend.

## 9. Hasil Lab (`/lab`)

| Method | Path | Body | Respons | Izin |
|---|---|---|---|---|
| GET | `/lab/results` | `?kind=penerimaan\|qc-fg` | `LabResultView[]` | semua |
| GET | `/lab/summary` | | `{ waiting: number; released: number; avgWaitMin: number }` (3, 3, 52) | semua |
| POST | `/lab/results/{id}/decision` | `{ status: "dirilis" \| "ditolak", note }` | `{ result: LabResultView, log }` | `lab.decide` |

```ts
interface LabResultView extends LabResult { decision?: LabDecision; eta?: string /* "15.30" untuk uji-ulang */ }   // LabResult (mock/ops.ts), LabDecision (lib/demo.ts): { status, note, by, at }
```

- Keputusan hanya untuk `kind "penerimaan"` dengan `status` `hasil-siap` atau `uji-ulang`; selain itu 422. `dirilis` saat `uji-ulang` → 422 (`"Rilis menunggu hasil uji ulang."`). `ditolak` wajib `note`. Keputusan kedua → 409.
- Audit `kind "lab"`, `title "Hasil lab {subject} {status}"`, `detail` = id lab, `tone` `ok` (dirilis) / `crit` (ditolak). Event `lab.decided`.
- **Efek samping wajib:** `dirilis` memindahkan RT ke tahap `Released` di `/receiving`; `ditolak` mengeluarkan RT dari antrean (tahap baru `Ditolak` tidak ditampilkan di 7 tahap). `/lab/summary` dan `/receiving.labSummary` ikut berubah.

## 10. Daftar Hold (`/hold`)

| Method | Path | Body | Respons | Izin |
|---|---|---|---|---|
| GET | `/holds` | | `Hold[]` (terbaru dulu, termasuk riwayat sebelum demo) | semua |
| POST | `/holds` | `{ trigger, rt, lots: Lot[], note }` | `{ result: Hold, log }` | `hold.submit` |
| POST | `/holds/{id}/review` | `{ status: "aktif" \| "ditolak" \| "dilepas", note }` | `{ result: Hold, log }` | `hold.review` |
| GET | `/holds/{id}/genealogy` | | `Genealogy` | semua |

```ts
// Hold (lib/demo.ts): { id, trigger, rt, lots: Lot[], note, status: "diajukan"|"aktif"|"ditolak"|"dilepas", by, at, review?: { note, by, at } }
interface Genealogy { hold: Hold; handoffs: Handoff[]; labTests: { id: string; subject: string; result: string }[]; lots: (Lot & { place: string; shipped: boolean })[] }
```

- `POST /holds`: `id` diberi backend (`HOLD-001`, urut). Sudah ada hold dengan `trigger` sama dan `status ≠ "ditolak"` → 409. Audit `kind "hold"`, `title "Daftar hold diajukan ke QA"`, `detail "{n} lot dari {rt}, pemicu {trigger}"`, `tone "warn"`. Event `hold.created`.
- Transisi yang sah: `diajukan → aktif | ditolak`, `aktif → dilepas`. Lainnya 422. `ditolak` dan `dilepas` wajib `note`.
- Audit review: `aktif` → `"Hold disetujui QA"` (`crit`), `ditolak` → `"Pengajuan hold ditolak"` (`neutral`), `dilepas` → `"Hold dilepas"` (`ok`); `detail` = id hold. Event `hold.reviewed`.
- Lot dengan `shipped: true` = **recall**; selainnya **hold** di gudang (lihat `/lots/locations`). Skenario: FG-1013-05 terkirim ke DC Sidoarjo.
- Riwayat sebelum demo (`HOLD-2610`) bersifat baca saja.

## 11. Riwayat Persetujuan (`/persetujuan`) dan realtime

| Method | Path | Respons |
|---|---|---|
| GET | `/audit` | `?kind=rencana\|hold\|lab\|constraint\|instruksi` → `LogEntry[]` (terbaru dulu, termasuk riwayat 13 Okt) |
| GET | `/audit.csv` | CSV UTF-8 BOM, kolom: Waktu, Jenis, Keputusan, Objek, Catatan, Oleh, Peran |
| GET | `/events` | `text/event-stream` |

```ts
// LogEntry (lib/demo.ts): { id: number; kind: LogKind; title; detail; note; by; role; at; tone }
```

Event SSE (`event:` nama, `data:` JSON `{ id, kind, at }`): `plan.decided`, `plan.solved`, `instruction.acked`, `limits.updated`, `hold.created`, `hold.reviewed`, `lab.decided`, `demand.sent`, `snapshot.updated` (data pabrik berubah), `source.synced`. FE memuat ulang resource yang terdampak (tabel di `05` §4.3).

## 12. Context Graph (`/graph`)

| Method | Path | Respons |
|---|---|---|
| GET | `/graph` | `{ nodes: { id, type, label, rank, source }[]; edges: { id, source, target, label, planned? }[] }` |

- `type` wajib salah satu dari 16 nilai ini (FE memetakannya ke ikon di `evidence-graph.tsx` dan ke jenis legenda di `lib/graph.ts`; nilai lain tampil tanpa ikon dan jenis default):
  - asal: `Farm`, `RT`
  - mutu: `LabResult`, `CIPEvent`
  - proses: `Bay`, `Buffer`, `Thermal`, `Separator`, `Storage`, `Cream`, `Premix`, `Mixing`, `Sterilisasi`, `Aseptic`, `Filling`
  - lot: `Lot`
  Tipe baru = tambah ke kedua mapping FE dan ke daftar ini di PR yang sama.
- `rank` = urutan lapisan dari hulu (farm 0) ke hilir (lot 10, lab QC 11); dipakai layout berlapis di Traceability.
- Semua `source`/`target` edge harus ada di `nodes` (diuji).

## 13. Sumber Data (`/sumber-data`)

| Method | Path | Respons |
|---|---|---|
| GET | `/data-sources` | `DataSource[]` |
| POST | `/data-sources/{id}/test` | `{ ok: boolean; text: string; latencyMs: number }` |
| POST | `/data-sources/{id}/sync` | `{ result: DataSource, log: null }` (memperbarui `lastSync`), event `source.synced` |

`DataSource.feeds` menyebut node/relasi graph yang diisi sumber itu; harus konsisten dengan `03` §4.1.

## 14. Pengguna & Peran (`/pengguna`)

Memakai `/roles`, `/session`, `/session/role` (§2). Peran: `planner`, `receiving`, `supervisor`, `qa`. Izin: `demand.send`, `plan.decide`, `constraint.edit`, `instruction.ack`, `hold.submit`, `hold.review`, `lab.decide` (matriks di `lib/roles.ts`).

## 15. Simulasi 3D (`/simulasi`)

| Method | Path | Respons | Tipe FE |
|---|---|---|---|
| GET | `/site/layout` | `SiteLayout` | `mock/site.ts` `SITE` |
| GET | `/site/status` | `?view=before\|after` → `SiteStatus` | `SITE_STATUS[view]` |
| GET | `/site/bottlenecks` | `?view=before\|after` → `Bottleneck[]` | `BOTTLENECKS[view]` |
| (pakai ulang) | `/production/aseptic-tanks`, `/production/fillers`, `/assets/mid-tanks` | status unit di dalam gedung | |

- `SiteLayout` boleh menyertakan `labels?: { id: string; text: string; x: number; z: number }[]` untuk label area; tanpa itu FE memakai teks bawaan.
- `SiteLayout` berversi (`origin.tracedAt`); berubah hanya bila tata letak dikoreksi (misal setelah kunjungan). Semua angka meter, sumbu x timur, z selatan, origin = titik plant di `origin.lat/lon`.
- `SiteStatus` = `SITE_STATUS[view]` + field baru `viewLabel` (`"Rencana awal · 14.42"` / `"Rekomendasi · proyeksi 15.30"`). Diturunkan backend dari snapshot dan plan view: `bays` dari blok bongkar yang aktif pada `NOW` (atau proyeksi 15.30 untuk `after`), `yard` = RT di tahap Sampling/Lab test/Released diurutkan prioritas (holding tersisa terkecil dulu), `lab` (tone `crit` bila rata-rata tunggu > 45 menit, `warn` > 25 `[asumsi]`), `at2Starved` + `starvationAt` dari blok starvation F2/F4, `silos` = level/kapasitas RMT-1..3, `onTheWay` = jumlah RT tahap On the way.
- `Bottleneck[]` maksimal 4, urutan: lab, RT kritis, bay, filling; `focus` ∈ `overview|lab|yard|bay1|bay2|silos|f2`.
- `view` = `before` (rencana awal) atau `after` (rekomendasi). Setelah planner menyetujui, FE tetap bisa membandingkan keduanya.

## 16. Ringkasan cakupan

Setiap layar dan setiap data statis FE dipetakan ke endpoint di atas. Inventaris lengkap baris per baris (termasuk teks yang masih tertulis di komponen) ada di `05-INTEGRASI-FE-BE.md` §2.
