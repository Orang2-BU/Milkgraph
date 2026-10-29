# 02 — PLAN: MilkGraph

> Rencana, status, dan langkah berikut dari mockup ke prototipe. Lingkup dari `01-PRD.md`, desain `08-DESIGN.md`, arsitektur `03`, kontrak `04`, integrasi `05`. Diperbarui 29 Okt 2026.

## 1. Keputusan

| Hal | Keputusan | Alasan |
|---|---|---|
| Output mockup | 14 halaman klik-able: 4 layar inti (Receiving Flow, Rencana & What-if, Traceability, Simulasi 3D) + 10 halaman pendukung yang berbagi state demo dan peran | Mencakup dua problem statement, konfigurasi pabrik, dan alur antar-departemen |
| Teknologi FE | Next.js 16 + TypeScript strict + Tailwind v4 + lucide-react; graph @xyflow/react (Traceability) dan SVG force-directed (Context Graph); 3D `three` 0.170 tanpa react-three-fiber; grafik Recharts | Recharts dipilih untuk grafik dengan sumbu, tooltip, garis referensi (basis chart shadcn/ui) |
| Data mockup | `mock/scenario.json`, `mock/ops.ts`, `mock/site.ts`; berlabel Data simulasi | Dataset panitia/mentor menyusul |
| State mockup | `lib/demo.ts` (localStorage) dengan aksi tulis + audit; "Atur ulang demo" | Semua halaman saling terhubung tanpa backend |
| Aturan | `lib/rules.ts`, diuji `tests/rules.test.mjs`, diekspor golden ke `mock/fixtures/` | Menjadi referensi port backend |
| Stack prototipe | Python FastAPI, Neo4j, PostgreSQL (+ time-series), OR-Tools CP-SAT, SimPy, LLM tool-calling | Sesuai proposal; detail `03` |
| Kontrak FE-BE | REST `/api/v1` + SSE; field identik tipe TS; fixture sebagai seed dan golden | Mencegah miskom; detail `04`, `05` |
| Nama plant di UI | Netral; sumber layout disebut "plant susu di Ngajum, Malang"; nama mitra hanya di docs/pitch | Menghindari kesan produk resmi |
| Materi mitra | Tidak masuk repo | Bertanda tidak untuk disebarluaskan |

## 2. Skenario data simulasi

Rabu 14 Okt 2026, shift siang, snapshot 14.42 `[data simulasi]`:

- **Receiving:** 8 RT di plant (RT-23 sampai RT-30), 4 dalam perjalanan, 3 loading di farm. Lab test rata-rata 52 menit (RT-24, RT-27, RT-28). RT-26 sudah rilis lab tetapi menunggu bay 24 menit; umur susu 9j 20m dari batas 10j 30m `[asumsi]`.
- **Bay:** Bay 1 bongkar RT-23 (selesai 15.15), Bay 2 CIP 14.10-15.20, Bay 3 bongkar RT-25 (selesai 15.00). RMT-2 88% penuh.
- **Proses dan filling:** 5 UHT → 5 AT → 10 filler. AT-2 melayani F2 (Stroberi 200 ml) dan F4 (Stroberi Kids 105 ml), level 1.480 L, butuh 8.290 L/jam. UHT-3/AT-3/F5/F6 CIP, F8 ganti format, F10 breakdown, F3 dan F9 siaga.
- **Rencana FIFO:** RT-26 dijadwalkan di Bay 2 14.50 (bentrok CIP), selesai bongkar lewat batas holding time; UHT-2 harus mengejar 10.200 L/jam (> 9.000); AT-2 kosong 15.50, F2 dan F4 berhenti 45 menit. 3 dari 6 constraint dilanggar.
- **Rekomendasi solver:** RT-26 ke Bay 1 15.15-15.50, RT-24 ke Bay 3, RT-27 ke Bay 2 setelah CIP, RT-28 ke Bay 1, RT-29 ke Bay 3; laju UHT-2 8.540 L/jam. 0 constraint dilanggar.
- **What-if:** CIP Bay 2 molor sampai 16.00; rekomendasi menyisakan jeda F2/F4 15 menit (dalam toleransi 20 menit `[asumsi]`).
- **Trace:** lot FG-1013-07 (UHT Cokelat 200 ml) positif residu antibiotik. RMT-2 berisi RT-02 31%, RT-04 12%, RT-06 27%, RT-09 30%. RT-04 masuk 5 lot (3%-12%), 36.100 pak, dibanding 14 lot / 101.200 pak tanpa genealogi volume. FG-1013-05 sudah terkirim (recall). Rantai batch SJ-NGD-1013-04 → RMB-1013-02 → STB-1013-04 → MXB-1013-07 → lot.
- **Pasokan:** rencana kirim 31 RT / 310.800 L dari 5 farm; kebutuhan dari rencana produksi 278.659 L; kapasitas 310.680 L.

## 3. Status pekerjaan

| # | Tugas | Status | Bukti |
|---|---|---|---|
| 1 | Scaffold, token `08-DESIGN` di `@theme`, font | Selesai | `app/globals.css`, `app/layout.tsx` |
| 2 | Shell: sidebar 14 halaman, top bar, drawer mobile, pilih peran, atur ulang demo | Selesai | `components/shell/` |
| 3 | Data skenario + tipe | Selesai | `mock/scenario.json`, `mock/types.ts`, `tests/scenario.test.mjs` |
| 4 | Receiving Flow | Selesai | `components/receiving/` |
| 5 | Rencana & What-if | Selesai | `components/rencana/` |
| 6 | Traceability + Graph View + rantai batch + genealogi | Selesai | `components/trace/` |
| 7 | Simulasi 3D dengan tata letak nyata dari citra satelit, kontrol putar/geser, layar penuh | Selesai | `components/simulasi/`, `mock/site.ts` |
| 8 | Responsif 375/768/1440, a11y, e2e | Selesai | `tests/browser.mjs`, `artifacts/` |
| 9 | State demo bersama + peran | Selesai | `lib/demo.ts`, `lib/roles.ts` |
| 10 | Constraint per definisi mitra + uji kelayakan | Selesai | `lib/rules.ts`, `tests/rules.test.mjs` |
| 11 | Halaman pendukung (Bay & Tangki, Filling, Pasokan & Permintaan, Constraint, Persetujuan, Lab, Hold, Context Graph, Sumber Data, Pengguna) | Selesai | `components/*`, `mock/ops.ts` |
| 12 | Penyelarasan materi mitra | Selesai | `01` §5.4 |
| 13 | Gaya kaca lembut, gradasi hijau, grafik Recharts | Selesai | `app/globals.css`, `components/pasokan/line-chart.tsx` |
| 14 | Dokumen arsitektur, kontrak API, panduan integrasi | Selesai | `docs/03`, `04`, `05` |
| 15 | Fixture + golden untuk backend | Selesai | `scripts/export-fixtures.mjs`, `mock/fixtures/` |
| 16 | Backend M0-M8 | Belum | `05` §5 |
| 17 | Migrasi FE ke mode api | Belum | `05` §4 |

## 4. Pemeriksaan

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm fixtures
node tests/browser.mjs
```

`tests/browser.mjs` butuh dev server di port 3100 dan Chrome terpasang. `pnpm fixtures` harus dijalankan ulang setiap data mock atau aturan berubah, lalu fixture ikut di-commit.

## 5. Langkah berikut

| Urutan | Pekerjaan | Pemilik | Rujukan |
|---|---|---|---|
| 1 | Review mentor: holding time, toleransi, matriks changeover, fungsi gedung, format batch | Tim + mentor | `05` §9 |
| 2 | Backend M0-M2: API berbasis fixture, tulis + audit + SSE | Backend | `05` §5 |
| 3 | FE: klien API + mode `api` dengan antarmuka `lib/demo.ts` yang sama | Frontend | `05` §4 |
| 4 | Backend M3: port rules, lolos golden | Backend | `04` §6 |
| 5 | Backend M4: Neo4j + template trace + algoritma proporsi | Backend | `04` §8, `05` §5.3 |
| 6 | Backend M5-M6: simulator SimPy, solver CP-SAT | Backend | `03` §2 |
| 7 | Backend M7: asisten LLM tool-calling | Backend | `04` §8 |
| 8 | Ukur target PRD §8 terhadap baseline FIFO | Tim | `01` §8 |
| 9 | Backend M8: konektor nyata read-only | Backend | `04` §13 |
