# 03 — ARCHITECTURE: MilkGraph

> Arsitektur target prototipe (setelah mockup) dan peta modul frontend yang sudah ada. Dibaca bersama `04-API-CONTRACT.md` (kontrak endpoint) dan `05-INTEGRASI-FE-BE.md` (inventaris data FE → BE, langkah sinkronisasi, catatan untuk tim backend). Diperbarui 29 Okt 2026.

## 1. Prinsip arsitektur

1. **Graph menyimpan fakta, solver mengambil keputusan, LLM menjelaskan.** Tidak ada angka keputusan yang dihitung LLM.
2. **Backend adalah satu-satunya sumber kebenaran.** Frontend tidak menyimpan data domain; semua yang sekarang ada di `mock/*` dan `lib/demo.ts` pindah ke backend (lihat `05` §2).
3. **Kontrak = tipe TypeScript yang sudah dipakai layar.** Respons API memakai nama field dan bentuk yang persis sama dengan `mock/types.ts`, `mock/ops.ts`, `mock/site.ts`, `lib/demo.ts`, `lib/rules.ts`, `lib/roles.ts`. Backend boleh menambah field, tidak boleh mengganti atau menghapus.
4. **Read-only ke sistem pabrik.** Konektor SCADA, LIMS, weighbridge, CIP, MES, dan ERP hanya membaca. Keputusan (rencana, hold, rilis lab) tercatat di MilkGraph dan dijalankan manusia; aplikasi tidak mengendalikan mesin.
5. **Semua tulis tercatat.** Setiap aksi tulis menghasilkan satu baris audit (append-only) dan satu event realtime.
6. **Jujur soal data.** Nilai simulasi berlabel `[simulasi]`, parameter yang belum divalidasi berlabel `[asumsi]`, fungsi gedung 3D berlabel "perkiraan".

## 2. Komponen

```text
 Sumber pabrik (read-only)          Simulator (prototipe)
 SCADA/Historian · LIMS · WB ·      SimPy: RT, bay, tangki, CIP,
 CIP · MES · ERP gudang             filling, lab per timestamp
            \                         /
             v                       v
          Ingest & konektor (FastAPI worker)
            |                 |                  |
            v                 v                  v
     Neo4j (graph fakta)   PostgreSQL (state,   Time-series (level,
     transfer, batch,      keputusan, audit,    flow, suhu per 10 dtk;
     genealogi             user, limit, hold)   TimescaleDB/Postgres)
            \                 |                  /
             v                v                 v
                FastAPI  /api/v1  (REST + SSE)
                  |        |          |        |
            Rules/Solver  Trace &   Asisten   Site 3D
            (CP-SAT)      genealogi (LLM tool- (layout +
                                     calling)  status)
                                |
                                v
                Next.js frontend (repo ini)
```

| Komponen | Teknologi | Tanggung jawab | Status |
|---|---|---|---|
| Frontend | Next.js 16 App Router, TypeScript strict, Tailwind v4, lucide-react, @xyflow/react, three 0.170, Recharts | 14 halaman, state UI, format tampilan | Selesai (mock) |
| API | Python FastAPI, Pydantic v2 | Semua endpoint `04-API-CONTRACT.md`, otorisasi peran, audit, SSE | Belum |
| Graph | Neo4j 5 (Docker atau AuraDB) | Node dan relasi `§4`, query template trace | Belum |
| Database relasional | PostgreSQL 16 | User, peran, keputusan rencana, hold, keputusan lab, konfirmasi instruksi, limit (berversi), audit log, notifikasi, status konektor | Belum |
| Time-series | TimescaleDB (ekstensi Postgres) atau tabel Postgres biasa | Level tangki, flow, suhu, kecepatan filler | Belum |
| Solver | OR-Tools CP-SAT | Susun ulang antrean RT, bay, CIP; hasil = `Plan.after` | Belum |
| Rules | Python, port dari `lib/rules.ts` | Cek 6 constraint, instruksi, sisa holding time; harus lolos `mock/fixtures/golden-rules.json` | Belum |
| Simulator | SimPy + Pandas | Kejadian per timestamp untuk prototipe; menghasilkan data yang sama bentuknya dengan konektor nyata | Belum |
| Asisten | LLM dengan tool-calling (LangChain/LlamaIndex opsional) | Memilih template query terverifikasi, mengisi parameter, merangkai jawaban; abstain bila tidak ada template | Belum |

## 3. Peta modul frontend

| Path | Isi | Nasib saat integrasi |
|---|---|---|
| `app/<route>/page.tsx` | 14 route, masing-masing memanggil satu komponen halaman | Tetap |
| `components/<halaman>/` | UI per halaman (receiving, simulasi, tangki, filling, rencana, pasokan, constraint, persetujuan, trace, lab, hold, graph, sumber-data, pengguna) | Tetap; sumber data diganti hook API |
| `components/shell/app-shell.tsx` | Sidebar, top bar, panel shift, notifikasi, profil/peran, panduan demo | Tetap; notifikasi, shift, sesi dari API |
| `components/ui/index.tsx` | Badge, Card, Modal, SourceModal, Toggle, PageHeading, RoleNote, Timeline | Tetap; `SourceModal` ambil `GET /sources/{id}` |
| `components/trace/genealogy.tsx` | Rantai serah-terima batch, laporan genealogi | Data dari `GET /trace/handoffs`, `GET /holds/{id}/genealogy` |
| `components/simulasi/plant-scene.tsx` | Renderer three.js; tidak menyimpan data | Data dari `GET /site/layout`, `/site/status`, `/production/*`, `/assets/mid-tanks` |
| `components/pasokan/line-chart.tsx` | Grafik tren Recharts | Tetap |
| `lib/demo.ts` | State demo + aksi tulis (localStorage) | **Diganti** klien API dengan nama fungsi sama (`05` §4) |
| `lib/rules.ts` | Aturan 6 constraint, instruksi, sisa holding | Logika pindah ke backend; file ini jadi referensi + mode mock |
| `lib/roles.ts` | Peran dan matriks izin | Data dari `GET /roles`; backend menegakkan izin |
| `lib/graph.ts` | Layout force-directed Context Graph | Tetap (perhitungan tampilan); data dari `GET /graph` |
| `lib/format.ts`, `lib/nav.ts` | Format angka/waktu, menu | Tetap (konfigurasi UI) |
| `lib/data.ts` | `scenario` dari `mock/scenario.json` | **Dihapus** setelah semua layar memakai API |
| `mock/scenario.json`, `mock/ops.ts`, `mock/site.ts`, `mock/types.ts` | Data simulasi dan tipe | Data pindah ke backend; tipe tetap sebagai kontrak; `pnpm fixtures` mengekspor ke `mock/fixtures/` |
| `tests/` | `scenario.test.mjs`, `rules.test.mjs`, `browser.mjs` | Tetap; ditambah contract test (`05` §6) |
| `scripts/export-fixtures.mjs` | Ekspor data + golden rules ke JSON | Dipakai backend sebagai seed dan golden test |

## 4. Model data

### 4.1 Graph (Neo4j)

**Label node** (properti wajib: `id` unik, `label` tampilan, `source` ID bukti):

| Label | Contoh `id` | Properti tambahan |
|---|---|---|
| `Farm` | `farm-b` (label "Farm Ngadirejo") | `passRate30d`, `coolingC` |
| `RoadTanker` | `rt-04` (label "RT-04") | `volumeL`, `sjNo` (surat jalan), `farmId` |
| `LabResult` | `lab-4471` | `kind` (`penerimaan`/`qc-fg`), `result`, `sampledAt` |
| `Bay` | `bay-2` | `status` |
| `RawMilkBuffer` | `rmt-2` | `capacityL` |
| `Thermal`, `Separator`, `Storage`, `Cream`, `Premix`, `Mixing`, `Sterilisasi`, `Aseptic`, `Filling` | `th-1`, `sp-1`, `st-4`, `ct-1`, `pm-3`, `mx-2`, `uht-1` (label UHT-2), `at-2`, `f2`, `f4` | `capacityL`, `state` |
| `Lot` | `fg-07` (label "FG-1013-07") | `product`, `packs`, `location`, `shipped` |
| `CIPEvent` | `cip-b2` | `tStart`, `tEnd` |
| `MaintenanceWindow` | (belum ada di mock) | `assetId`, `tStart`, `tEnd` |

Catatan: field `type` di `scenario.graph.nodes` adalah nama label di atas (`Farm`, `RT`, `LabResult`, `Buffer`, `Thermal`, `Separator`, `Storage`, `Cream`, `Premix`, `Mixing`, `Sterilisasi`, `Aseptic`, `Filling`, `Lot`, `Bay`, `CIPEvent`). Backend mengirim nilai `type` persis seperti ini karena frontend memakainya untuk ikon dan pengelompokan warna.

**Relasi** (properti waktu ISO 8601 dengan offset `+07:00`):

| Relasi | Properti | Label tampilan di `edges[].label` |
|---|---|---|
| `(:Farm)-[:COLLECTED {sjNo, tStart, tEnd, volumeL}]->(:RoadTanker)` | | `COLLECTED` |
| `(:LabResult)-[:TESTED]->(:RoadTanker|:Lot)` | | `TESTED` |
| `(:RoadTanker)-[:FILLED_INTO {volumeL, tStart, tEnd, batchId}]->(:RawMilkBuffer)` | `batchId` = RMB | `FILLED_INTO 8.800 L` |
| `(:Tank|:Process)-[:TRANSFER {volumeL, tStart, tEnd, batchId}]->(:Process|:Tank)` | | `TRANSFER RMB-1013-02` |
| `(:Separator)-[:HANDOFF {batchId, tStart, tEnd, volumeL, linkedBy}]->(:Storage|:Mixing)` | `linkedBy` = metode penyambungan | `HANDOFF STB-1013-04` |
| `(:Separator)-[:CREAM]->(:Cream)` | | `CREAM` |
| `(:Premix)-[:PREMIX]->(:Mixing)` | | `PREMIX cokelat` |
| `(:Filling)-[:FILLED {share}]->(:Lot)` | `share` = proporsi kandidat (%) | `FILLED 12%` |
| `(:Aseptic)-[:TRANSFER]->(:Filling)` / tidak mengisi | | `TRANSFER` / `TIDAK MENGISI 13 Okt` |
| `(:CIPEvent)-[:OCCUPIES {tStart, tEnd}]->(:Bay|:Tank)` | | `OCCUPIES 14.10 - 15.20` |
| `(:RoadTanker)-[:PLANNED {t}]->(:Bay)` | rencana, `planned: true` | `PLANNED 14.50` |
| `(:LabResult)-[:RELEASED {t}]->(:RoadTanker)` | | `RELEASED 14.18` |

### 4.2 Relasional (PostgreSQL)

| Tabel | Kolom inti | Sumber kontrak |
|---|---|---|
| `users` | `id`, `name`, `initials`, `role` | `lib/roles.ts` `ROLES` |
| `permissions` | `permission`, `role` | `PERMISSIONS` |
| `plan_decisions` | `plan_id`, `status`, `note`, `by`, `at`, `shift_id` | `PlanDecision` |
| `holds`, `hold_lots` | `id` (`HOLD-###`), `trigger`, `rt`, `note`, `status`, `by`, `at`, `review_*`; lot: `lot_id`, `product`, `percent`, `packs` | `Hold`, `Lot` |
| `lab_decisions` | `lab_id`, `status`, `note`, `by`, `at` | `LabDecision` |
| `instruction_acks` | `instruction_id`, `by`, `role`, `at` | `demo.acks` |
| `limits_versions` | semua field `Limits` + `by`, `at` | `Limits` |
| `audit_log` | `id`, `kind`, `title`, `detail`, `note`, `by`, `role`, `at`, `tone` (append-only, tanpa UPDATE/DELETE) | `LogEntry` |
| `notifications` | `id`, `title`, `subtitle`, `source_id`, `tone`, `created_at` | `05` §2.6 |
| `demand_sends` | `date`, `detail`, `by`, `at` | aksi `sendDemand` |
| `data_source_status` | `id`, `last_sync`, `latency_ms`, `status` | `DataSource` |
| `lots`, `lot_locations` | `id`, `product`, `packs`, `place`, `shipped` (dari ERP) | `lotLocation` |

### 4.3 Waktu dan satuan

- Disimpan UTC; dikirim ISO 8601 `+07:00` (WIB) untuk field mentah. Field tampilan yang sudah ada di tipe FE (`"14.42"`, `"13 Okt 22.40"`, `"9j 20m"`) tetap dikirim dalam format itu (lihat `04` §1.4).
- Volume liter (bilangan bulat), suhu °C (1 desimal), durasi menit (bilangan bulat), laju L/jam, kecepatan pak/menit, level dalam liter + kapasitas.
- Gantt memakai menit sejak awal horizon (`horizon.start`, default 13.00); `NOW` = menit snapshot (14.42 → 102).

## 5. Alur utama

1. **Ingest:** konektor membaca sumber → menulis time-series dan event ke Postgres, node/relasi ke Neo4j (transfer dengan jendela waktu dan batchId).
2. **Snapshot:** endpoint baca menyusun view-model per halaman dari Postgres + Neo4j + time-series (pola BFF: satu endpoint mengisi satu kartu/halaman).
3. **Rencana:** rencana awal (FIFO) diuji rules → bila tidak layak, solver CP-SAT menghasilkan rekomendasi → planner menyetujui → instruksi terbit untuk receiving/supervisor → konfirmasi tercatat.
4. **Trace:** QC out-of-spec masuk dari LIMS → notifikasi → trace mundur/maju (query template di Neo4j + algoritma proporsi) → pengajuan hold/recall → keputusan QA.
5. **Realtime:** setiap tulis → audit + event SSE → semua klien memuat ulang resource terkait (`04` §11).

## 6. Keamanan dan peran

- Mode `demo`: header `X-Demo-Role` memilih peran (pengganti kartu akun di sidebar); tanpa password.
- Mode `live` (prototipe lanjut): login + JWT dengan claim `role`; header `X-Demo-Role` ditolak.
- Backend menegakkan matriks izin `lib/roles.ts` di setiap endpoint tulis; frontend hanya menonaktifkan tombol.
- CORS hanya untuk origin frontend yang terdaftar.

## 7. Q&A Keputusan

| # | Pertanyaan | Keputusan | Alasan |
|---|---|---|---|
| 1 | React atau Streamlit? | React (Next.js) | Sudah dibangun 14 halaman dengan 3D dan graph interaktif |
| 2 | Bentuk API? | REST JSON `/api/v1` + SSE untuk realtime | Sederhana, cocok dengan FastAPI, cukup untuk sinkron multi-pengguna |
| 3 | Bentuk respons? | View-model per halaman dengan field identik tipe FE | Frontend tinggal mengganti sumber data; tidak ada pemetaan ulang yang bisa salah |
| 4 | Siapa menghitung constraint? | Backend; `lib/rules.ts` jadi referensi dan golden test | Satu sumber kebenaran; solver memakai aturan yang sama |
| 5 | Teks hasil constraint dibuat siapa? | Backend, string identik golden | Teks langsung ditampilkan; perbedaan kata = miskom |
| 6 | Time-series di Neo4j? | Tidak; di Postgres/TimescaleDB | Sesuai keputusan proposal; graph untuk relasi, bukan deret waktu |
| 7 | Asisten boleh menulis Cypher bebas? | Tidak; hanya template terdaftar (`04` §8) | Jawaban bisa diaudit; abstain bila tidak ada template |
| 8 | Proporsi genealogi? | Irisan waktu + volume dengan asumsi tercampur sempurna per tangki (`05` §5.3) | Sesuai PRD; asumsi dicatat |
| 9 | Data 3D dari mana? | Layout statis berversi dari backend (`/site/layout`), status dari snapshot (`/site/status`) | 3D ikut data nyata; layout luar dari citra satelit, perlu konfirmasi lapangan |
| 10 | Nama merek di UI? | Netral; sumber disebut "plant susu di Ngajum, Malang" | Menghindari kesan produk resmi |
| 11 | Lokasi file materi Greenfields? | Tidak masuk repo | Materi bertanda "tidak untuk disebarluaskan" |
