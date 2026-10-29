# Docs MilkGraph

Index dokumen. Diperbarui 29 Okt 2026.

| File | Isi | Untuk |
|---|---|---|
| `01-PRD.md` | Problem statement, pengguna, 14 halaman, peran, penyelarasan materi mitra, alur demo, target, risiko | Semua |
| `02-PLAN.md` | Keputusan, skenario data simulasi, status pekerjaan, pemeriksaan, langkah berikut | Semua |
| `03-ARCHITECTURE.md` | Komponen sistem, peta modul FE, model data Neo4j + PostgreSQL, alur utama, keamanan, Q&A keputusan | FE + BE |
| `04-API-CONTRACT.md` | Kontrak REST `/api/v1` + SSE: setiap endpoint, tipe, izin, validasi, event, algoritma rules | BE (wajib), FE |
| `05-INTEGRASI-FE-BE.md` | Inventaris semua data statis FE → endpoint, pemetaan per halaman, migrasi FE, urutan kerja BE M0-M8, tes kontrak, skrip uji demo, catatan BE, pertanyaan terbuka | BE (wajib), FE |
| `06-DEPLOY-DOKPLOY.md` | Analisis frontend-only, Dockerfile, pengaturan Dokploy, environment, smoke test, rollback | FE / deploy |
| `08-DESIGN.md` | Design system (token, komponen, kaca lembut, layout) | FE |
| `RANGKUMAN-LENGKAP-MILKGRAPH.md` | Rangkuman ide dan riset awal | Konteks |
| `PROMPT-CODEX.md` | Arsip prompt build awal (usang) | Arsip |
| `brand/` | Aset logo | FE |

## Mulai cepat untuk tim backend

1. Baca `01` → `03` → `04` → `05`.
2. `pnpm install`, `pnpm dev`, coba 16 langkah di `05` §7.
3. `pnpm fixtures` → `mock/fixtures/*.json` = seed data dan golden test.
4. Kerjakan `05` §5 mulai M0. Ada yang tidak jelas: tulis di `05` §9 dan tanya FE dulu.

## Aturan sinkron

- Nama field = tipe TypeScript di kode. Tambah field boleh, ganti/hapus tidak.
- Satu perubahan kontrak = satu PR berisi tipe TS, `04`, fixture (`pnpm fixtures`), dan test.
- Data mock atau rules berubah → jalankan ulang `pnpm fixtures` dan commit hasilnya.
