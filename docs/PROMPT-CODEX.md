> **Usang (15 Okt 2026):** mockup sudah dibangun ulang mengikuti `Proposal_MilkGraph.docx`. Sumber kebenaran sekarang `01-PRD.md` sampai `05-INTEGRASI-FE-BE.md`, `08-DESIGN.md`, dan kode (lihat `README.md`). Prompt di bawah hanya arsip versi awal.

# Prompt Codex: Build Mockup MilkGraph

Salin semua teks di bawah garis ke Codex. Jalankan Codex di folder `D:\Aplikasi\MilkGraph`.

---

Kamu membangun **mockup front-end klik-able** untuk MilkGraph, dashboard operasional pabrik pengolahan susu untuk lomba PLAY IT! PLUS Deeptech Hackathon 2026. Ini mockup: tanpa backend, tanpa AI sungguhan, tanpa login. Semua data berasal dari JSON statis simulasi.

## 0. Baca dulu (wajib, sebelum menulis kode)

1. `docs/01-PRD.md`: masalah, prinsip produk, peta 13 halaman (§5), isi 3 layar inti, model graph (§6), alur demo (§8).
2. `docs/02-PLAN.md`: keputusan teknologi, skenario data simulasi (§2), tahapan dan kriteria selesai (§3).
3. `docs/08-DESIGN.md`: token desain (YAML frontmatter) dan aturan UI. **Ini sumber kebenaran tampilan.** Semua warna, font, radius, spacing diambil dari token ini.

Jika prompt ini bertentangan dengan docs, ikuti docs dan sebutkan konfliknya di laporan akhir.

## 1. Stack

- Next.js (App Router, versi stabil terbaru) + TypeScript strict + pnpm, di root folder ini (bukan subfolder).
- Tailwind CSS v4. Token dari `08-DESIGN.md` dipetakan ke `@theme` di `app/globals.css` (contoh: `--color-primary`, `--color-surface-muted`, `--radius-lg`). Dilarang hex/rgb hardcode di komponen.
- Font: Onest dan JetBrains Mono via `next/font/google` (`display: "swap"`).
- Ikon: `lucide-react` saja, `strokeWidth={1.75}`.
- Graph: `@xyflow/react`.
- Dependency lain tidak boleh tanpa alasan tertulis. Tidak ada UI kit besar (MUI, Chakra, Ant, DaisyUI). Gantt, tabel, badge, dan kartu ditulis sendiri.
- Script `package.json`: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`).

## 2. Struktur

```
app/
  layout.tsx            # font, AppShell
  globals.css           # @theme dari 08-DESIGN
  page.tsx              # Monitor
  telusuri/page.tsx
  jadwal/page.tsx
  [10 route placeholder]/page.tsx
components/
  shell/                # Sidebar, TopBar, AppShell, Placeholder
  ui/                   # Card, Panel, MetricCard, Badge, Button, IconButton, Table, Toggle
  monitor/  telusuri/  jadwal/
lib/
  nav.ts                # satu sumber daftar 13 halaman (grup, label, route, ikon, status)
  format.ts             # format angka/waktu Indonesia
mock/
  scenario.json         # satu skenario terpadu (lihat §5)
```

Kode minimum yang benar: tanpa state manager, tanpa abstraksi untuk kebutuhan hipotetis, tanpa kode mati, tanpa `any`, tanpa `@ts-ignore`, tanpa `eslint-disable`, tanpa `console.log`.

## 3. Shell aplikasi

### Sidebar (navigasi utama)

- Daftar dari `lib/nav.ts`, 13 halaman dalam 5 grup, sesuai tabel `01-PRD.md` §5 "Peta halaman lengkap". Ikon lucide yang cocok (contoh: Monitor `LayoutDashboard`, Antrean Truk `Truck`, Tangki & CIP `Container`, Lini Produksi `Factory`, Telusuri `Search`/`Network`, Insiden `TriangleAlert`, Risiko Mutu `ThermometerSun`, Jadwal & What-if `CalendarClock`, Riwayat Persetujuan `ClipboardCheck`, Context Graph `Share2`, Sumber Data `Database`, Pengaturan `Settings`, Pengguna `Users`).
- Animated collapsible sidebar (pola "animated sidebar" 21st.dev/Aceternity, ditulis sendiri dengan CSS transition, **bukan** komponen sidebar shadcn): 264px terbuka, 76px ciut (ikon dalam lingkaran 44px, gaya rail referensi), transisi lebar 200ms, label memudar.
- Desktop ≥1200px: terbuka default, tombol ciut/buka (`aria-expanded`, `aria-controls`). 768-1199px: ciut default. <768px: tersembunyi; tombol menu di top bar membuka drawer dengan scrim, focus trap, Escape menutup, fokus kembali ke tombol menu, scroll body terkunci.
- Item aktif: pill `surface` putih + `aria-current="page"`. Judul grup kecil `label` abu (bukan eyebrow di atas heading halaman).
- Halaman placeholder tetap bisa diklik, diberi titik kecil abu dan `title="Belum tersedia di mockup"`.
- Atas: logo teks "MilkGraph" (kotak kecil hijau + wordmark). Bawah: kartu akun "Rina Wulandari, Supervisor Produksi, Shift Siang" (avatar inisial, bukan foto).

### Top bar

Kiri: tombol menu (mobile), judul halaman (`display`) + subjudul satu baris. Kanan: chip "Data simulasi", pill pilihan shift ("Shift Siang, Sel 14 Okt"), tombol ikon notifikasi (badge angka 3), avatar inisial. Aksi halaman (secondary + satu primary hijau) di baris header di bawah judul pada mobile.

### Placeholder (10 halaman)

Satu komponen `Placeholder` dipakai semua route non-inti: kartu putih di tengah panel, ikon halaman dalam lingkaran, judul halaman, satu kalimat fungsi halaman (tulis sesuai namanya, contoh Antrean Truk: "Mengatur slot kedatangan dan urutan bongkar truk tangki berdasarkan kesiapan QC dan tangki."), badge "Belum tersedia di mockup", tombol secondary "Kembali ke Monitor". Data teks diambil dari `lib/nav.ts`.

## 4. Tiga layar inti

Semua angka/teks dari `mock/scenario.json`. Ikuti isi `01-PRD.md` §5 dan alur demo §8.

### 4.1 Monitor (`/`)

Judul "Monitor Operasional", subjudul "Kondisi pabrik saat ini, diperbarui 14.42". Aksi: secondary "Ekspor ringkasan" (disabled, tooltip "Belum tersedia di mockup"), primary "Telusuri insiden".

1. **Baris metrik (4 kartu):** Truk antre (6), Rata-rata tunggu QC (58 menit, delta naik), Tangki siap terima (1 dari 4), Line berjalan (1 dari 3). Tiap kartu: ikon dalam lingkaran, label, delta panah, angka `metric` tabular, sparkline area hijau pudar (SVG sendiri, 12 titik).
2. **Alur pabrik:** 5 node pill horizontal Penerimaan → QC → Tangki → Mixing → Line, dihubungkan garis; node QC "waspada", Tangki "waspada", Line "kritis". Klik node menggulir ke bagian terkait. Di mobile alur menjadi vertikal.
3. **Kartu insiden (satu-satunya kartu hijau gelap `surface-inverse` di layar ini):** "Line 2 berhenti, starvation", "Sejak 14.30, 12 menit", 3 faktor terkait singkat, tombol "Telusuri penyebab" → `/telusuri?q=line-2`.
4. **Tangki (panel, 4 kartu atau tabel):** ID mono, isi (volume/kapasitas L dengan bar), suhu °C, umur bahan, status CIP, badge risiko mutu (Normal/Waspada/Kritis + skor 0-100). Label kecil di bawah skor: "Indeks risiko, bukan peluang rusak".
5. **Antrean truk (tabel):** plat (mono), pemasok, volume L, tiba, tunggu (menit), status QC badge. Mobile: daftar kartu.
6. **Grafik tunggu QC per jam (batang membulat):** jam ini hijau `accent-fill`, jam lalu hijau keabuan `neutral-fill`, dengan sumbu dan nilai terbaca.

### 4.2 Telusuri (`/telusuri`)

Judul "Telusuri", subjudul "Tanya kondisi pabrik. Setiap jawaban menunjukkan buktinya." Aksi primary: "Buat rencana pemulihan" → `/jadwal?skenario=truk-telat`.

Tata letak desktop: kiri 5 kolom (tanya + jawaban), kanan 7 kolom (graph). Mobile: tab "Jawaban / Graph".

1. **Kolom tanya:** input pill + tombol kirim. Chip contoh: "Kenapa Line 2 berhenti 14.30?", "Produk JAD-901 dari mana?", "Produk apa saja yang memakai susu Truk B 4127?". Jawaban dipilih dari 3 jawaban siap di JSON berdasarkan chip atau kecocokan kata kunci; pertanyaan lain → state "Data belum cukup untuk menjawab. Coba salah satu contoh." Saat mengirim, tampilkan loading 600ms (skeleton), lalu jawaban. Query `?q=line-2` membuka jawaban pertama langsung.
2. **Jawaban:** kesimpulan 1-2 kalimat; "Faktor terkait" bernomor (contoh: Tangki T2 kosong sejak 14.24; Truk B 4127 tertahan QC 90 menit, kadar air 0,25%; pergantian shift 14.00; maintenance pompa P-2 tertunda). Tiap faktor punya chip sumber mono (contoh `QC-3391 · 13.12`). Hover/fokus chip → node terkait di graph tersorot. Catatan kecil: "Faktor terkait berdasarkan data, perlu dikonfirmasi supervisor."
3. **Mode lacak (toggle pill):** "Mundur: produk → sumber" dan "Maju: bahan → produk terdampak". Jawaban JAD-901 menampilkan porsi campuran batch (RMB-1182 62%, RMB-1185 38%) sebagai bar bertumpuk.
4. **Graph (@xyflow/react):** node pill custom berlabel tipe + ID (Truk, Batch, QC, Tangki, Mixing, Line, Produk, Shift, Maintenance, Insiden), sekitar 14-18 node, layout kiri ke kanan sesuai alur. Rantai bukti: node `accent-soft` + border hijau, edge `accent-fill` tebal; lainnya opacity 40%. Kontrol zoom dengan `aria-label`. Node bisa difokus keyboard. `prefers-reduced-motion` mematikan animasi. Legenda kecil tipe node.

### 4.3 Jadwal & What-if (`/jadwal`)

Judul "Jadwal & What-if", subjudul "Bandingkan rencana sebelum disetujui." Aksi: secondary "Tolak", primary "Setujui jadwal".

1. **Skenario (pill toggle):** "Kondisi saat ini" dan "What-if: Truk A 2208 terlambat 2 jam". Query `?skenario=truk-telat` memilih what-if.
2. **Kartu hasil rekomendasi (satu-satunya kartu hijau gelap di layar ini):** 4 metrik sebelum → sesudah: menit starvation, jumlah CIP, umur bahan maksimum, estimasi biaya downtime (Rp, label `[asumsi]` dengan tooltip "Rp 18.500 per menit, asumsi"). Isi angka di JSON harus konsisten dengan Gantt.
3. **Gantt:** baris per sumber daya (Bongkar truk, T1-T4, Line 1-3), rentang 13.00-20.00, blok membulat; jenis blok: proses (hijau pudar), CIP (hijau keabuan berarsir), starvation (merah pudar), bongkar truk (abu). Toggle "Sebelum / Sesudah". Garis vertikal "sekarang 14.42". Scroll horizontal hanya di dalam kartu Gantt. Setiap blok punya `aria-label` lengkap.
4. **Alasan perubahan (daftar):** contoh "Truk B 4127 dibongkar setelah uji ulang QC ke Tangki T3: T3 selesai CIP 14.55", "CIP Line 3 dimajukan ke 15.10: urutan varian Plain lalu Cokelat mengurangi satu CIP", "Batch di T4 diprioritaskan ke Mixing M1: indeks risiko mutu 71". Tiap alasan punya chip sumber.
5. **Persetujuan:** "Setujui" membuka dialog konfirmasi (focus trap, Escape, catatan opsional) → status berubah "Disetujui oleh Rina Wulandari, 14.47" dan masuk daftar riwayat kecil di bawah. "Tolak" mewajibkan catatan. Status disimpan di state halaman saja (reload = reset), dan tersedia tombol "Atur ulang demo".

## 5. Data simulasi (`mock/scenario.json`)

Satu cerita konsisten di 3 layar, sesuai `02-PLAN.md` §2: Selasa 14 Okt 2026, shift siang, sekarang 14.42. 6 truk dari 4 pemasok fiktif (contoh "KUD Sumber Rejeki", "Peternak Mitra Ngantang", "KUD Tirta Makmur", "CV Lembu Sejahtera"), volume 6.200-8.400 L, plat format Jawa Timur fiktif (B 4127 hanya ID truk internal, tulis "TRK B 4127"). Tangki T1-T4, Mixing M1-M2, Line 1-3, produk JAD-901 (UHT Cokelat 200 ml) dan 3 produk lain. Angka tidak terlalu rapi (58 menit, 7 jam 40 menit, 71, 6.380 L). Buat tipe TypeScript untuk JSON di `mock/types.ts` dan impor JSON secara bertipe.

## 6. Aturan UI wajib (dari 08-DESIGN)

- Tanpa emoji. Tanpa em-dash/en-dash di teks UI; rentang memakai "-".
- Format Indonesia: "8.400 L", "0,25%", "14.30", "Rp 1.240.000".
- Satu tombol primary hijau per layar; satu kartu hijau gelap per layar.
- Status selalu teks + warna (Normal teal, Waspada kuning tua, Kritis merah). Hijau merek bukan arti aman.
- Teks `accent-fill` tidak dipakai di bawah 18px; teks hijau kecil memakai `primary`.
- Skor risiko tidak pernah disebut peluang/probabilitas.
- Tidak ada elemen dekoratif tanpa fungsi.
- Kontras WCAG AA; focus ring 2px `focus` offset 2px; target sentuh ≥44px di bawah 1200px; semua tombol ikon punya `aria-label`.
- State lengkap: hover, active, focus-visible, disabled, loading (skeleton), empty, error.
- Responsif 375, 768, 1440 tanpa scroll horizontal halaman. `min-h-[100dvh]`, bukan `h-screen`.

## 7. Urutan kerja

Kerjakan bertahap, jalankan `pnpm typecheck && pnpm lint && pnpm build` setelah setiap tahap:

1. Scaffold + token `@theme` + font.
2. `lib/nav.ts`, AppShell, Sidebar (termasuk drawer mobile), TopBar, Placeholder, 10 route placeholder.
3. `mock/types.ts` + `mock/scenario.json`.
4. Komponen `ui/`.
5. Monitor.
6. Telusuri.
7. Jadwal.
8. Sapuan responsif, aksesibilitas, dan state.

## 8. Kriteria selesai

- `pnpm build`, `pnpm typecheck`, `pnpm lint` hijau tanpa suppress.
- 13 route terbuka; 3 inti lengkap; 10 placeholder konsisten.
- Alur demo `01-PRD.md` §8 bisa diklik dari awal sampai akhir: Monitor → "Telusuri penyebab" → jawaban Line 2 + graph tersorot → JAD-901 lacak mundur → "Buat rencana pemulihan" → what-if → Setujui → status tercatat.
- Keyboard saja: semua aksi bisa dijangkau; drawer dan dialog benar (focus trap, Escape, fokus kembali).
- Tidak ada hex di luar `globals.css`: buktikan dengan `grep -rnE "#[0-9a-fA-F]{3,6}\b" app components lib` (hanya `globals.css` yang boleh muncul).

## 9. Laporan akhir

Tulis ringkas: file yang dibuat, hasil tiap perintah cek (output asli, bukan karangan), hal yang belum selesai atau menyimpang dari docs beserta alasannya. Jangan commit, push, atau deploy.
