# 05 — INTEGRASI FE ↔ BE: MilkGraph

> Panduan kerja untuk menyambungkan frontend (repo ini, sudah jadi dengan data mock) ke backend FastAPI. Berisi inventaris **setiap** data statis di FE dan endpoint penggantinya, langkah migrasi FE, urutan kerja BE, sinkronisasi realtime, tes kontrak, skrip uji demo, dan catatan untuk tim backend. Kontrak endpoint lengkap: `04-API-CONTRACT.md`. Arsitektur: `03-ARCHITECTURE.md`. Diperbarui 29 Okt 2026.

## 0. Ringkas untuk tim backend

1. Baca urut: `01-PRD.md` (apa dan kenapa) → `03-ARCHITECTURE.md` → `04-API-CONTRACT.md` → dokumen ini.
2. Jalankan FE: `pnpm install`, `pnpm dev` (port 3000), buka semua 14 halaman, coba skrip demo §7. Itu perilaku yang harus sama persis setelah integrasi.
3. Jalankan `pnpm fixtures`. Hasilnya `mock/fixtures/*.json` adalah **seed data dan golden test** backend. Endpoint GET pertama-tama cukup mengembalikan isi fixture yang sesuai; setelah itu baru diganti hitungan nyata dengan hasil yang tetap sama untuk skenario ini.
4. Jangan mengubah nama field. Kalau butuh field baru, tambahkan (FE mengabaikan field asing) dan catat di `04`.
5. Setiap endpoint tulis: cek izin peran → validasi → simpan → tulis audit → kirim event SSE → kembalikan `{ result, log }`.
6. Kalau ada yang tidak jelas, tulis di §9 "Pertanyaan terbuka" dan tanyakan ke FE sebelum menebak.

## 1. Kondisi sekarang

- FE berjalan penuh tanpa backend. Data domain ada di:
  - `mock/scenario.json` (snapshot receiving, rencana, trace, graph, sumber bukti),
  - `mock/ops.ts` (lini filling, tangki, lab, farm, demand, sumber data, riwayat),
  - `mock/site.ts` (tata letak dan status 3D),
  - `lib/rules.ts` (aturan constraint dan fakta skenario),
  - `lib/roles.ts` (peran dan izin),
  - `lib/demo.ts` (state tulis: keputusan, hold, lab, konfirmasi, limit, audit; disimpan di localStorage),
  - beberapa teks dan angka yang masih tertulis di komponen (§2.6).
- Semua halaman berbagi state lewat `useDemo()`; aksi tulis lewat fungsi `decidePlan`, `submitHold`, `reviewHold`, `decideLab`, `acknowledge`, `setLimits`, `sendDemand`, `setRole`, `resetDemo`.
- Pemeriksaan: `pnpm test` (9 test: `tests/scenario.test.mjs` + `tests/rules.test.mjs`), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `node tests/browser.mjs` (butuh dev server port 3100 dan Chrome).

## 2. Inventaris data statis → endpoint

Kolom "Dipakai" menyebut file komponen. Tidak ada data domain yang boleh tersisa di FE setelah integrasi kecuali yang ditandai **UI** (konfigurasi tampilan, bukan data).

### 2.1 `mock/scenario.json`

| Key | Isi | Dipakai | Endpoint |
|---|---|---|---|
| `date`, `now` | tanggal dan jam snapshot | `receiving.tsx`, `ui/index.tsx` (Timeline "Sekarang"), shell | `GET /meta` (`date`, `now`, `horizon.nowOffset`) |
| `user` | pengguna default | (tidak lagi dipakai; diganti peran) | `GET /session` |
| `metrics` | 4 kartu metrik | `receiving.tsx` | `GET /receiving` `.metrics` |
| `stages` | 7 tahap state machine RT | `receiving.tsx` | `GET /receiving` `.stages` |
| `tankers` | RT di plant | `receiving.tsx` | `GET /receiving` `.tankers` |
| `assets` | Bay 1-3, RMT-1..3 | `receiving.tsx`, `tangki.tsx` | `GET /receiving` `.assets`, `GET /assets` |
| `labHistory` | tunggu lab per jam | `receiving.tsx` | `GET /receiving` `.labHistory` |
| `qcEvent` | pemicu QC out-of-spec | `trace.tsx`, `genealogy.tsx` | `GET /quality/active-event` |
| `holdBaseline` | cakupan tanpa genealogi | `trace.tsx`, `hold.tsx` | `GET /holds/summary` |
| `sources` | semua bukti (`SourceModal`) | `ui/index.tsx`, semua halaman | `GET /sources`, `GET /sources/{id}` |
| `answers` | 3 jawaban asisten | `trace.tsx`, `evidence-graph.tsx` | `POST /assistant/ask`, `GET /trace/backward`, `/trace/forward`, `/trace/explain` |
| `plans` | rencana FIFO + what-if, blok Gantt, alasan | `rencana.tsx`, `tangki.tsx`, `filling.tsx`, `constraint.tsx`, `receiving.tsx`, shell | `GET /plans`, `GET /plans/{id}` |
| `handoffs` | rantai serah-terima batch | `genealogy.tsx` | `GET /trace/handoffs?lotId=` |
| `graph` | node dan edge | `context-graph.tsx`, `evidence-graph.tsx` | `GET /graph` |

### 2.2 `mock/ops.ts`

| Export | Isi | Dipakai | Endpoint |
|---|---|---|---|
| `fillers` | F1..F10 | `filling.tsx`, `pasokan.tsx`, `plant-scene.tsx` | `GET /production/fillers` |
| `asepticTanks` | AT-1..5 (+ UHT, inflow per rencana) | `filling.tsx`, `plant-scene.tsx` | `GET /production/aseptic-tanks` |
| `UNIT_STATE` | label + tone status unit | `filling.tsx` | `GET /production/unit-states` |
| `changeoverMatrix` | matriks SOP | `filling.tsx` | `GET /production/changeover-matrix` |
| `midTanks` | ST, CT, PM, MX | `tangki.tsx`, `plant-scene.tsx` | `GET /assets/mid-tanks` |
| `lotLocation` | lokasi lot (gudang/terkirim) | `genealogy.tsx` (`lotAction`), `trace.tsx`, `hold.tsx` | `GET /lots/locations?ids=` |
| `farms` | rencana kirim + kesiapan mutu | `pasokan.tsx` | `GET /supply/farms` |
| `demandPlan`, `PROCESS_LOSS` | rencana produksi per SKU, susut | `pasokan.tsx` | `GET /supply/demand-plan` |
| `trend` | tren permintaan dan susu masuk | `pasokan.tsx` | `GET /supply/trend` |
| `cipLog` | log CIP per aset | `tangki.tsx` | `GET /assets/cip-log` |
| `labResults` | hasil lab RT dan QC FG | `lab.tsx` | `GET /lab/results` |
| `dataSources` | 6 konektor | `sumber-data.tsx` | `GET /data-sources` |
| `pastLog` | audit sebelum demo | `persetujuan.tsx` | `GET /audit` (sudah termasuk) |
| `pastHolds` | hold sebelum demo | `hold.tsx` | `GET /holds` (sudah termasuk) |

### 2.3 `mock/site.ts` (Simulasi 3D)

| Export | Isi | Dipakai | Endpoint |
|---|---|---|---|
| `SITE` | origin, footprint, gedung utama (zona, bay, silo, proses, tangki tengah, jalur, stasiun, rute susu), gedung lain, jalan, perkerasan, POI (gerbang, weighbridge, IPAL, parkir, truk, yard, RT masuk), area pohon | `plant-scene.tsx` | `GET /site/layout` |
| `SITE_STATUS` | status per tampilan: isi bay, antrean yard, lab, AT-2 starvation + jamnya, level silo, jumlah RT di jalan | `plant-scene.tsx` | `GET /site/status?view=` |
| `BOTTLENECKS` | daftar bottleneck samping kanvas | `simulasi.tsx` | `GET /site/bottlenecks?view=` |

`plant-scene.tsx` sudah tidak memuat konstanta data; posisi kamera (`FOCI`) dan material adalah **UI**.

### 2.4 `lib/rules.ts`, `lib/roles.ts`, `lib/demo.ts`

| Item | Isi | Endpoint / tindakan |
|---|---|---|
| `DEFAULT_LIMITS`, `Limits` | batas constraint | `GET /limits`, `PUT /limits`, `GET /limits/schema` |
| `evaluate`, `violations`, `starvation`, `holdingLeft` | aturan | `POST /plans/{id}/check` (golden: `mock/fixtures/golden-rules.json`) |
| `instructions` | instruksi dari rekomendasi | `GET /plans/{id}/instructions` |
| `NOW`, `RT26_AGE`, `FACTS`, `MAINTENANCE`, `BREAKDOWN`, `LINES`, `SOP_CHANGEOVER` | fakta skenario | dihitung backend (`04` §6.1) |
| `ROLES`, `PERMISSIONS`, `can`, `whoCan` | peran dan izin | `GET /roles`; izin ditegakkan backend; `whoCan` = pesan 403 |
| `DemoState.role` | peran aktif | `GET /session`, `POST /session/role` |
| `decisions` | keputusan rencana | `GET /decisions`, `POST /plans/{id}/decision` |
| `holds` | pengajuan hold | `GET /holds`, `POST /holds`, `POST /holds/{id}/review` |
| `labs` | keputusan lab | `GET /lab/results` (`decision`), `POST /lab/results/{id}/decision` |
| `acks` | konfirmasi instruksi | `GET /plans/{id}/instructions` (`ackedBy`), `POST /instructions/{id}/ack` |
| `limits` | limit tersimpan | `GET /limits` |
| `log` | audit | `GET /audit` |
| `demoClock()` | jam demo (14.42 + menit berjalan) | jam server (`LogEntry.at` dari backend) |
| `resetDemo()` | hapus state demo | `POST /demo/reset` (mode demo) |
| `sendDemand()` | kirim kebutuhan | `POST /supply/demand/send`, `GET /supply/demand-sends` |

### 2.5 `components/shell/app-shell.tsx`

| Data tertulis | Endpoint |
|---|---|
| Tombol shift "Shift Siang, Rab 14 Okt"; panel "Shift Siang · 14.00 - 22.00 · Snapshot 14.42"; "Shift lain belum tersedia" | `GET /shifts` |
| Daftar 3 notifikasi + badge angka 3 | `GET /notifications` |
| Footer "Snapshot 14.42 WIB" | `GET /meta` `snapshotLabel` |
| Kartu akun, avatar, panel "Masuk sebagai" | `GET /session`, `GET /roles`, `POST /session/role` |
| "Atur ulang demo" | `POST /demo/reset` |
| Teks Panduan demo, menu navigasi (`lib/nav.ts`) | **UI** |

### 2.6 Teks dan angka yang masih tertulis di komponen

| File | Tertulis | Ganti dengan |
|---|---|---|
| `receiving.tsx` | "Lab test 52 menit", "Bay 2 CIP sampai 15.20", "Holding time RT-26" (faktor kartu sorotan) | `GET /receiving` `.incident.factors` |
| `receiving.tsx` | "RT-26 tersisa", "RT-26 pindah ke Bay 1" | `.incident.rt` + instruksi `current:{rt}` |
| `receiving.tsx` | "Antrean RT menumpuk karena lab test lama dan Bay 2 sedang CIP." | `.incident.summary` |
| `receiving.tsx` | grafik "52 menit", "14 menit" | `.labSummary.avgMinutes`, `.deltaMinutes` |
| `receiving.tsx` | "batas holding 10j 30m [asumsi]" di footer tabel | `GET /limits` `holdingMin` |
| `rencana.tsx` | daftar sumber daya Gantt, "Horizon 13.00 - 20.00", "RT antre di plant 16.00" | `PlanView.resources`, `.horizon`, `.queueLabel` |
| `rencana.tsx` | kalimat ketergantungan AT-2/F2/F4 | **UI** (penjelasan tetap), boleh dari `PlanView.dependencyNote` bila konfigurasi berubah |
| `tangki.tsx`, `filling.tsx` | `NOW = 102`, `plan = scenario.plans[0]` | `GET /meta` `horizon.nowOffset`, `GET /plans/current` |
| `tangki.tsx` | "kapasitas 60.000 L per tangki", "Batas antar-CIP tangki 24 jam [asumsi]", "Rencana awal. Blok merah bentrok dengan CIP Bay 2." | dari `assets[].capacity`, `GET /assets/cip-policy`, `CheckResult.before.cip.text` |
| `filling.tsx` | "snapshot 14.42", "AT-2 kosong 15.50, F2 dan F4 berhenti" | `GET /meta`, dihitung dari `/production/aseptic-tanks` |
| `lab.tsx` | metrik "52 menit", "perkiraan 15.30" (uji ulang), "sebelum snapshot 14.42" | `GET /lab/summary`, `LabResult.eta` (field baru), `GET /meta` |
| `trace.tsx` | `RT-04` di tabel, dialog, `submitHold({ rt: "RT-04" })`; tombol "Lanjut trace maju dari RT-04" | `Answer.subjectRt` (field baru, §2.8) |
| `trace.tsx` | `ask()` pemetaan kata kunci ke jawaban | `POST /assistant/ask` |
| `genealogy.tsx` | uji lab terkait (LAB-4471, LAB-8812) | `GET /holds/{id}/genealogy` `.labTests` |
| `hold.tsx` | teks kosong "trace maju dari RT-04" | `GET /quality/active-event` + `Answer.subjectRt` |
| `constraint.tsx` | `CONSTRAINTS` (label, deskripsi, min/max/step, jendela uji Bay 3 dan F1) | `GET /limits/schema` |
| `sumber-data.tsx` | hasil "Uji koneksi" dan "Sinkron sekarang" disimulasikan di FE | `POST /data-sources/{id}/test`, `/sync` |
| `pasokan.tsx` | `CAPACITY_L` (320 t / 1,03) | `GET /supply/demand-plan` `.capacityL` |
| `simulasi.tsx` | toggle "Rencana awal · 14.42", "Rekomendasi · proyeksi 15.30" | `GET /site/status` `.viewLabel` (field baru) |
| `plant-scene.tsx` | label area ("Gerbang dan weighbridge", "IPAL", "Yard antrean RT", "Degassing · Thermal · Separator", dll.) | opsional `SiteLayout.labels`; tanpa itu FE memakai teks bawaan (**UI**) |
| semua dialog | contoh placeholder catatan | **UI** |

### 2.7 Tetap di FE (bukan data)

`lib/nav.ts` (menu dan route), `lib/format.ts`, ikon, warna/tone per status (`STATUS`, `MID_STATE`, `KINDS` di Context Graph), legenda, teks bantuan, posisi kamera 3D, layout force-directed (`lib/graph.ts`), ekspor CSV di browser (boleh diganti `GET /audit.csv`). Semua nilai yang ditampilkan di dalamnya berasal dari API.

### 2.8 Field baru yang perlu ditambahkan ke kontrak

| Tipe | Field | Alasan |
|---|---|---|
| `Answer` | `subjectRt?: string` (kandidat RT untuk backward, RT sumber untuk forward) | Menghapus `RT-04` tertulis di `trace.tsx` |
| `ReceivingView.incident` | `summary: string` | Kalimat penjelasan kartu sorotan |
| `LabResult` | `eta?: string` | "perkiraan 15.30" untuk uji ulang |
| `SiteStatus` | `viewLabel: string` | Label toggle Simulasi 3D |
| (endpoint baru) | `GET /assets/cip-policy` → `tankIntervalHours` | Batas antar-CIP di Bay & Tangki |

Semuanya tambahan (non-breaking) dan sudah tercantum di `04`.

## 3. Pemetaan per halaman

| Halaman | Route | GET | Tulis | Event yang memicu muat ulang |
|---|---|---|---|---|
| Receiving Flow | `/` | `/receiving`, `/plans/current/check`, `/decisions`, `/limits`, `/plans/current/instructions` | | `snapshot.updated`, `plan.decided`, `limits.updated`, `lab.decided` |
| Simulasi 3D | `/simulasi` | `/site/layout`, `/site/status?view=`, `/site/bottlenecks?view=`, `/production/aseptic-tanks`, `/production/fillers`, `/assets/mid-tanks`, `/meta` | | `snapshot.updated`, `plan.decided` |
| Bay & Tangki | `/tangki` | `/assets`, `/assets/cip-log`, `/assets/cip-policy`, `/assets/mid-tanks`, `/plans/current`, `/decisions`, `/plans/current/instructions`, `/meta` | `POST /instructions/{id}/ack` | `plan.decided`, `instruction.acked`, `snapshot.updated` |
| Lini Filling | `/filling` | `/production/aseptic-tanks`, `/production/fillers`, `/production/unit-states`, `/production/changeover-matrix`, `/plans/current`, `/decisions`, `/plans/current/instructions` | `POST /instructions/{id}/ack` | sama |
| Rencana & What-if | `/rencana` | `/plans`, `/plans/{id}/check`, `/decisions`, `/limits`, `/session` | `POST /plans/{id}/decision`, `POST /plans/{id}/solve` | `plan.decided`, `limits.updated`, `plan.solved` |
| Pasokan & Permintaan | `/pasokan` | `/supply/farms`, `/supply/demand-plan`, `/supply/trend`, `/supply/demand-sends`, `/production/fillers` | `POST /supply/demand/send` | `demand.sent` |
| Constraint | `/constraint` | `/limits`, `/limits/schema`, `/plans`, `POST /plans/{id}/check` (pratinjau dengan body `limits`) | `PUT /limits` | `limits.updated` |
| Riwayat Persetujuan | `/persetujuan` | `/audit` | (`GET /audit.csv`) | semua event tulis |
| Traceability | `/trace` | `/quality/active-event`, `/assistant/templates`, `/trace/*`, `/graph`, `/trace/handoffs`, `/lots/locations`, `/holds`, `/holds/summary` | `POST /assistant/ask`, `POST /holds` | `hold.created`, `hold.reviewed` |
| Hasil Lab | `/lab` | `/lab/results`, `/lab/summary` | `POST /lab/results/{id}/decision` | `lab.decided` |
| Daftar Hold | `/hold` | `/holds`, `/holds/summary`, `/lots/locations`, `/holds/{id}/genealogy` | `POST /holds/{id}/review` | `hold.created`, `hold.reviewed` |
| Context Graph | `/graph` | `/graph`, `/sources/{id}` | | `snapshot.updated` |
| Sumber Data | `/sumber-data` | `/data-sources` | `POST /data-sources/{id}/test`, `/sync` | `source.synced` |
| Pengguna & Peran | `/pengguna` | `/roles`, `/session` | `POST /session/role` | |
| Shell (semua) | | `/meta`, `/session`, `/shifts`, `/notifications`, `/sources/{id}` | `POST /session/role`, `POST /demo/reset` | semua event (badge notifikasi) |

## 4. Langkah migrasi FE

### 4.1 Mode data

- `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000`, `NEXT_PUBLIC_DATA_MODE=mock|api`.
- Mode `mock` = perilaku sekarang (untuk demo offline dan pengembangan UI). Mode `api` = semua dari backend. Kedua mode harus tetap jalan sampai integrasi selesai.

### 4.2 Lapisan klien (tanpa dependency baru)

1. `lib/api/client.ts`: `apiGet(path)`, `apiSend(method, path, body)`; menambah `X-Demo-Role` dari sesi; memetakan error ke `{ code, message, field }`; `result`/`log` dari respons tulis.
2. `lib/api/resource.ts`: hook `useResource<T>(path)` (fetch + cache per path + `invalidate(paths)`), langganan `EventSource(`${API}/api/v1/events`)` yang memanggil `invalidate` sesuai tabel §4.3.
3. **Pertahankan antarmuka `lib/demo.ts`.** `useDemo()` di mode api menyusun `DemoState` dari `/session`, `/decisions`, `/holds`, `/lab/results` (decision), `/plans/current/instructions` (acks), `/limits`, `/audit`. Fungsi `decidePlan`, `submitHold`, `reviewHold`, `decideLab`, `acknowledge`, `setLimits`, `sendDemand`, `setRole`, `resetDemo` mempertahankan nama dan parameter, tetapi memanggil endpoint lalu `invalidate`. Dengan cara ini komponen hampir tidak berubah.
4. Ganti impor data statis per file (urutan aman): `lib/data.ts` → hook `useScenarioPart()` per resource; `mock/ops.ts` → hook per endpoint; `mock/site.ts` → `useResource("/site/layout")` dll.
5. Pindahkan konstanta tingkat modul yang membaca data ke dalam komponen: `filling.tsx` (`plan`, `NOW`), `tangki.tsx` (`plan`, `bays`, `buffers`, `NOW`, `notReady`), `trace.tsx` (`forward`, `lots`, `packs`), `receiving.tsx` (`stages`), `pasokan.tsx` (semua total), `plant-scene.tsx` (layout + status diterima lewat props; efek three.js dibangun ulang saat props berubah).
6. Tangani state memuat dan error di setiap kartu (skeleton yang sudah ada di Traceability bisa dipakai pola yang sama).
7. Setelah semua halaman mode api lolos §7, hapus `lib/data.ts` dari jalur mode api (mock tetap untuk demo offline).

### 4.3 Event → muat ulang

| Event | Muat ulang |
|---|---|
| `plan.decided` | `/decisions`, `/plans/*/instructions`, `/site/status`, `/site/bottlenecks`, `/receiving`, `/audit`, `/notifications` |
| `plan.solved` | `/plans`, `/plans/*/check`, `/audit` |
| `instruction.acked` | `/plans/*/instructions`, `/audit` |
| `limits.updated` | `/limits`, `/plans/*/check`, `/receiving`, `/notifications`, `/audit` |
| `hold.created`, `hold.reviewed` | `/holds`, `/audit`, `/notifications` |
| `lab.decided` | `/lab/results`, `/lab/summary`, `/receiving`, `/site/status`, `/audit` |
| `demand.sent` | `/supply/demand-sends`, `/audit` |
| `snapshot.updated` | semua GET data pabrik (`/receiving`, `/assets*`, `/production/*`, `/site/status`, `/graph`, `/notifications`) |
| `source.synced` | `/data-sources` |

## 5. Urutan kerja backend

| Tahap | Isi | Selesai bila |
|---|---|---|
| M0 | Repo FastAPI, Pydantic model dari `04`, CORS, `/meta`, header `X-Demo-Role`, OpenAPI | `GET /meta` jalan; model Pydantic = tipe TS |
| M1 | **API berbasis fixture**: semua GET mengembalikan isi `mock/fixtures/*.json` yang sesuai | FE mode api tampil identik dengan mode mock di 14 halaman |
| M2 | Postgres: user, keputusan, hold, lab, ack, limit, audit, notifikasi; semua POST/PUT + validasi + audit + SSE `/events` | Skrip §7 lolos di mode api, termasuk dua tab browser sinkron |
| M3 | Port `lib/rules.ts` ke Python | Semua kasus `golden-rules.json` identik (ok, text, violations, starvation, holdingLeft, instructions) |
| M4 | Neo4j: muat graph dari fixture, query template `trace_backward`, `trace_forward`, `explain_resource`, `handoffs`, algoritma proporsi §5.3 | Jawaban sama dengan `scenario.json → answers` (nodes, edges, mix, lots) |
| M5 | Simulator SimPy: snapshot receiving, level tangki, lab, filling per timestamp; penurunan `site/status` dan `bottlenecks` | `GET /receiving` dan `/site/status` dihitung, bukan fixture, dengan angka skenario tetap sama |
| M6 | Solver CP-SAT: `POST /plans/{id}/solve` | Hasil `after` lolos 6 constraint; waktu solve < 30 detik (target PRD) |
| M7 | Asisten LLM tool-calling atas template M4 | Pertanyaan contoh → template yang benar; pertanyaan lain → `unknown` |
| M8 | Konektor nyata read-only (SCADA, LIMS, WB, CIP, MES, ERP) | `/data-sources/{id}/test` memakai koneksi nyata |

### 5.1 Validasi dan invarian yang wajib dijaga

- `stages[].count` = jumlah RT per tahap; rata-rata tunggu Lab test = `labSummary.avgMinutes`.
- `asset.fill ≤ asset.capacity`; `mix` berjumlah 100; persen lot pemicu di forward = persen RT kandidat di backward.
- Semua `source` yang dirujuk (metric, tanker, asset, factor, node) ada di `/sources`.
- Semua edge graph merujuk node yang ada; semua `answers[].nodes/edges` ada di graph.
- Satu AT = dua filler; filler yang tidak `jalan` punya `litres = 0`.
- Audit append-only; `LogEntry.id` unik dan naik.
- Aturan izin = `lib/roles.ts`; instruksi hanya dikonfirmasi peran pemiliknya.

### 5.2 Waktu dan pembulatan

Jam tampilan dibulatkan ke menit; menit Gantt bilangan bulat; persen dibulatkan ke bilangan bulat terdekat kecuali disebut lain; liter bilangan bulat; kebutuhan susu memakai `Math.round` per SKU lalu total dibagi `(1 − processLoss)` dan dibulatkan.

### 5.3 Algoritma proporsi genealogi

- Model tiap tangki sebagai campuran sempurna `[asumsi]`: simpan vektor proporsi sumber (RT) per tangki; transfer masuk menambah volume per sumber; transfer keluar membawa proporsi saat itu.
- Proporsi lot = proporsi di aseptic tank saat lot diisi (jendela waktu `FILLED`).
- Ambang hold: lot dengan kontribusi RT kandidat > 0% `[asumsi QA]` (sumber `GEN-01`).
- Catatan: persen di mock (RT-02 31%, RT-04 12%, RT-06 27%, RT-09 30%) adalah nilai skenario yang sudah memperhitungkan irisan waktu, **bukan** bagi rata volume RMT-2. Jangan menguji terhadap pembagian volume total. Untuk skenario ini backend wajib mengembalikan angka mock; untuk data baru gunakan algoritma di atas.

### 5.4 Status 3D

Aturan penurunan `SiteStatus` dan `Bottleneck` ada di `04` §15. Tata letak `SITE` hanya berubah lewat koreksi lapangan (simpan versi dan `tracedAt`). Kalau konfigurasi pabrik berubah (misal AT melayani filler lain), ubah `/production/aseptic-tanks` dan `SITE.hall.lanes` bersamaan.

## 6. Tes kontrak

1. `pnpm fixtures` menulis `mock/fixtures/`: `scenario.json`, `ops.json`, `site.json`, `roles.json`, `limits.json`, `golden-rules.json`.
2. Backend (pytest): untuk M1, setiap GET dibandingkan sama persis dengan fixture; untuk M3, setiap kasus `golden-rules.json` diuji; untuk M4, `answers` dibandingkan field per field.
3. FE: test `scenario.test.mjs` dan `rules.test.mjs` tetap jalan; tambahkan test yang memanggil API mode api terhadap backend lokal (urutan skrip §7).
4. Setiap perubahan kontrak: perbarui tipe TS, `04`, fixture, dan test di **satu** PR yang sama.

## 7. Skrip uji demo (nilai yang diharapkan)

Jalankan dari kondisi awal (`POST /demo/reset`). Hasil di mode api harus sama dengan mode mock.

| # | Peran | Langkah | Harus terlihat |
|---|---|---|---|
| 1 | planner | Buka `/` | Kartu sorotan "Rencana tidak layak, 3 constraint dilanggar", RT-26 tersisa 1j 10m, tunggu lab 52 menit, 8 RT di tabel |
| 2 | planner | `/rencana`, tampilan rencana awal | 3 dilanggar (flow, holding, cip), rekomendasi 0; Gantt punya baris F4 dengan starvation 15.50 |
| 3 | planner | Setujui rekomendasi (catatan opsional) | Banner disetujui; audit "Rekomendasi disetujui"; `/` berubah "Rekomendasi disetujui, RT-26 pindah ke Bay 1" |
| 4 | planner | `/tangki` | 5 instruksi receiving (RT-24 Bay 3 15.30, RT-26 Bay 1 15.15, RT-27 Bay 2 15.20, RT-28 Bay 1 16.05, RT-29 Bay 3 16.35), tombol konfirmasi nonaktif + catatan peran |
| 5 | receiving | Konfirmasi RT-26 | 1/5 dikonfirmasi; audit "Instruksi dikonfirmasi" oleh Dimas Prasetyo |
| 6 | supervisor | `/filling` konfirmasi instruksi F2 | "Filling F2 dan F4 tetap jalan, jeda pasokan AT-2 turun dari 45 ke 0 menit" |
| 7 | qa | `/trace` → Trace maju | 5 lot, 36.100 pak (dibanding 14 lot, 101.200 pak); FG-1013-05 recall (terkirim DC Sidoarjo); rantai 7 serah-terima, 2 bertanda celah |
| 8 | qa | Ajukan hold | `HOLD-001` status Menunggu QA; tombol ajukan nonaktif |
| 9 | qa | `/hold` setujui | "Hold aktif"; metrik hold aktif 5 lot · 36.100 pak; perlu recall 1 lot; laporan genealogi bisa dicetak |
| 10 | qa | `/lab` rilis LAB-9031 (RT-27) | "Dirilis QA"; menunggu keputusan 3 → 2; RT-27 pindah ke Released di `/` |
| 11 | qa | `/lab` coba rilis LAB-9029 (uji ulang) | Tombol rilis nonaktif; API menolak 422 |
| 12 | planner | `/constraint` ubah "Farm sampai tersimpan dingin" ke 10j 20m, simpan | Rekomendasi jadi 1 dilanggar; `/rencana` judul "1 constraint masih dilanggar"; audit berisi perubahan |
| 13 | planner | `/pasokan` kirim kebutuhan | Kebutuhan 278.659 L, rencana kirim 310.800 L, sisa 32.141 L; tombol jadi "Terkirim HH.MM" |
| 14 | semua | `/persetujuan` | Semua aksi di atas + 4 entri 13 Okt; filter per jenis dan unduh CSV jalan |
| 15 | semua | `/simulasi` rencana awal → rekomendasi | Label bottleneck berubah; F2/F4 merah → normal; RT di bay sesuai rekomendasi |
| 16 | dua tab | Aksi di tab A | Tab B berubah tanpa reload (SSE) |

## 8. Catatan untuk tim backend

- **Sumber kebenaran tampilan = API.** FE tidak menghitung ulang angka bisnis kecuali format. Jika angka API berbeda dari skrip §7, yang salah API kecuali data sumber memang berubah.
- **Teks hasil rules adalah kontrak.** Ditampilkan apa adanya; perbedaan satu kata membuat golden gagal.
- **Jangan ubah ID.** RT, LAB, FG, HOLD, sumber, aset dipakai sebagai kunci React, tautan, dan sorotan graph.
- **Peran ditegakkan di server.** Tombol nonaktif di FE hanya kenyamanan.
- **Audit tidak bisa diubah.** Koreksi = entri baru.
- **Hold bukan perintah gudang.** Status `aktif` berarti QA menyetujui; eksekusi fisik di luar sistem. Jangan memanggil ERP untuk mengunci stok.
- **Data simulasi berlabel.** Nilai `[simulasi]` dan `[asumsi]` di teks tetap ada sampai mentor memvalidasi.
- **Materi Greenfields rahasia.** Jangan menyalin slide atau gambar ke repo/backend; hanya angka dan keputusan yang sudah tercatat di docs.
- **Satu perubahan kontrak = satu PR** berisi tipe TS, `04`, fixture, dan test.

## 9. Pertanyaan terbuka

| # | Pertanyaan | Pemilik | Status |
|---|---|---|---|
| 1 | Batas holding time, toleransi starvation, batas level tangki, batas antar-CIP: nilai resmi? | Mentor Greenfields | `[asumsi]` |
| 2 | Fungsi gedung selain gedung utama dan posisi peralatan di dalam gedung | Kunjungan / mentor | perkiraan |
| 3 | Format nomor surat jalan dan batch di sistem pabrik | Mentor | contoh pola di `04` §1.5 |
| 4 | Data historis yang tersedia dari panitia (RT, lab, level, CIP) | Panitia | menunggu |
| 5 | Shift lain selain Shift Siang 14 Okt | Tim | belum ada di mock |
| 6 | Login nyata (SSO pabrik?) untuk mode live | Tim | mode demo dulu |
