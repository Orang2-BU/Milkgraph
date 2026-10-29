---
version: alpha
name: MilkGraph
description: Dashboard operasional pabrik susu. Permukaan kaca lembut dengan soft shadow di atas gradasi hijau tipis, aksen hijau dari palet mitra, satu kartu hijau gelap untuk sorotan.
colors:
  canvas: "#F4F4F3"
  surface: "#FFFFFF"
  surface-muted: "#ECECEA"
  surface-inverse: "#0F2A1D"
  on-surface: "#141414"
  on-surface-muted: "#6B6B68"
  on-inverse: "#FFFFFF"
  on-inverse-muted: "#A9D6B4"
  border: "#E2E2DF"
  primary: "#00782A"
  primary-hover: "#005130"
  on-primary: "#FFFFFF"
  accent-fill: "#008A30"
  accent-soft: "#E3F2E7"
  neutral-fill: "#D8E4DB"
  status-ok: "#0F766E"
  status-ok-soft: "#E1F3F1"
  status-warn: "#94580A"
  status-warn-soft: "#FDF4DC"
  status-crit: "#B91C1C"
  status-crit-soft: "#FCE9E9"
  focus: "#1D4ED8"
typography:
  display:
    fontFamily: Onest
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
  title:
    fontFamily: Onest
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  metric:
    fontFamily: Onest
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.1
    fontFeature: '"tnum"'
  body:
    fontFamily: Onest
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Onest
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 10px
  md: 16px
  lg: 24px
  xl: 32px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  app-frame:
    backgroundColor: transparent
    rounded: 0px
  panel:
    backgroundColor: "{colors.surface-muted}"
    rounded: "{rounded.lg}"
    padding: 20px
  card:
    backgroundColor: "color-mix(in oklab, {colors.surface} 64%, transparent)"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 20px
  card-highlight:
    backgroundColor: "{colors.surface-inverse}"
    textColor: "{colors.on-inverse}"
    rounded: "{rounded.lg}"
    padding: 20px
  nav-pill:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    height: 44px
  nav-pill-active:
    backgroundColor: "color-mix(in oklab, {colors.surface} 55%, transparent)"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    size: 44px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 0 20px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    height: 44px
  badge-ok:
    backgroundColor: "{colors.status-ok-soft}"
    textColor: "{colors.status-ok}"
    rounded: "{rounded.full}"
  badge-warn:
    backgroundColor: "{colors.status-warn-soft}"
    textColor: "{colors.status-warn}"
    rounded: "{rounded.full}"
  badge-crit:
    backgroundColor: "{colors.status-crit-soft}"
    textColor: "{colors.status-crit}"
    rounded: "{rounded.full}"
---

# 08 — DESIGN: MilkGraph

> Struktur diturunkan dari referensi dashboard "InvestIQ" (Dribbble), 11 Okt 2026 (template "Soft Op Dashboard"). Warna merek diganti 15 Okt 2026 ke palet hijau logo Greenfields (SVG Wikimedia Commons: #005130, #008A30, #78C58B, #92D1A0) sebagai inspirasi industri susu. Yang tidak diambil: logo, nama, dan aset merek Greenfields.

## Overview

Aku membaca ini sebagai: **dashboard pendukung keputusan untuk planner PPIC, koordinator receiving, supervisor produksi, dan QA/Lab pabrik susu**, dengan gaya **tenang, lembut, padat data, dengan hijau susu segar sebagai satu-satunya warna merek**.

Karakter: rapi dan bersahabat, bukan layar kontrol industri yang gelap dan bising. Supervisor membuka layar ini berjam-jam; warna kuat hanya untuk hal yang perlu tindakan.

## Colors

- **Kanvas `canvas`** abu sangat terang; **panel `surface-muted`** mengelompokkan kartu; **kartu `surface`** putih berisi data.
- **Hijau `primary` #00782A** untuk tombol utama dan teks aksen (kontras 5,6:1 dengan putih); hover `#005130` (hijau tua logo). **`accent-fill` #008A30** (hijau logo) hanya untuk grafik dan ikon besar (≥3:1), jangan untuk teks kecil.
- **`neutral-fill`** hijau keabuan untuk batang grafik pembanding/periode lalu.
- **`surface-inverse`** hijau sangat gelap #0F2A1D: maksimal **satu kartu per layar**, untuk hal paling penting (Receiving: rencana tidak layak; Rencana: rekomendasi solver).
- **Status** terpisah dari merek: teal = normal (digeser dari hijau agar tidak bentrok dengan merek), kuning tua = waspada, merah = kritis. Hijau merek tidak pernah berarti "berhasil" atau "aman". Status selalu disertai teks/ikon, tidak hanya warna.

## Typography

- **Onest** (self-host via `next/font`, `display: swap`) untuk semua teks; angka metrik memakai `tnum` agar kolom rata.
- **JetBrains Mono** untuk ID: RT (RT-26), lot (FG-1013-07), tangki (RMT-2), sumber (LAB-8812), dan query template.
- Hierarki: `display` judul halaman (satu per layar), `title` judul kartu, `metric` angka utama, `body` isi, `label` subjudul abu dan header tabel.
- Subjudul kartu satu baris abu (`on-surface-muted`) di bawah judul, seperti "Track your performance" di referensi. Tidak ada eyebrow label di atas judul.

## Layout

- **Frame:** penuh layar tanpa margin dan tanpa sudut membulat; latar `html` berupa satu gradasi radial hijau `primary` 18% di kanan atas di atas `canvas` (gradasi bawah sengaja dihapus), `background-attachment: fixed`. Padding workspace `--ws-pad`: 32px (desktop), 40px (≥1500px), 20px (tablet), 16px (mobile).
- **Sidebar kiri (navigasi utama):** 14 halaman dalam 5 grup (PRD §5). Sticky setinggi layar (`100dvh`) dan scroll sendiri; scrollbar hanya tampil saat hover. Collapsible: lebar 264px terbuka, 76px ciut (ikon saja dalam lingkaran, gaya rail referensi), animasi lebar 200ms. Item aktif = pill kaca putih. Logo di atas, kartu akun (ganti peran) di bawah. Mobile: drawer kaca dengan scrim, Escape menutup, focus trap, fokus kembali ke tombol menu.
- **Top bar:** sticky dengan latar kaca yang memudar ke bawah (blur 18px); breadcrumb kiri; kanan: chip "Data simulasi", pilihan shift (pill kaca), notifikasi, avatar.
- **Header halaman:** judul `display` + subjudul kiri; aksi kanan (secondary pill, satu primary pill hijau).
- **Grid:** 12 kolom, gap 16px. Panel abu berisi 2-3 kartu putih.
- **Responsif:** 1440 = sidebar terbuka; 768 = sidebar ciut, grid 2 kolom; 375 = sidebar jadi drawer, satu kolom, tabel jadi daftar kartu. Tanpa scroll horizontal halaman (Gantt boleh scroll di dalam kartunya sendiri).

## Elevation & Depth

Kaca lembut. Variabel di `:root` (`app/globals.css`):

| Token | Nilai | Dipakai |
|---|---|---|
| `--glass` | `surface` 64% | kartu, kartu tangki, placeholder, pemicu QC, dept-flow |
| `--glass-chip` | `surface` 55% | item nav aktif, kartu akun, tombol top bar, filter, callout |
| `--glass-strong` | `surface` 86% | modal, tooltip grafik, tombol kontrol 3D |
| `--glass-rim` | inset 1px `surface` 85% | tepi terang semua permukaan kaca |
| `--glass-blur` | `blur(22px) saturate(1.6)` | backdrop-filter |
| `--shadow-soft` | `0 14px 36px -18px` `surface-inverse` 26% | kartu |
| `--shadow-chip` | `0 8px 24px -12px` `surface-inverse` 24% | chip, tombol |
| `--shadow-overlay` | `0 24px 56px -16px` `surface-inverse` 32% | modal, drawer |

Bayangan berona hijau gelap (bukan abu) agar menyatu dengan gradasi. `prefers-reduced-transparency: reduce` mengembalikan semua permukaan ke warna solid tanpa blur.

## Shapes

Sangat membulat: kartu `lg` 24px, panel `lg`, tombol dan badge `full`, input `full`. Batang grafik ujung membulat penuh. Node graph berbentuk pill.

## Components

- **Kartu metrik:** ikon dalam lingkaran kecil + label, delta dengan panah (↗ hijau / ↘ abu), angka `metric`, sparkline area hijau pudar. Contoh: "Throughput receiving", "Tunggu lab test".
- **State machine RT (Receiving):** 7 kartu tahap (Farms, On the way, Sampling, Lab test, Released, Unloading, Stored) dengan jumlah RT dan status; lab test sebagai gerbang antrean memakai warna kritis. 7 kolom di ≥1400px, 4 di tablet, 2 di mobile.
- **Kartu sorotan rencana (hijau gelap):** status kelayakan, sisa holding time RT kritis, 3 faktor bersumber, tombol "Periksa kelayakan rencana".
- **Tabel:** header `label` abu, baris tanpa garis vertikal, badge status pill bertitik (seperti "Completed/Pending" di referensi).
- **Jawaban asisten (Traceability):** status "Jalur graph terverifikasi", chip query template `mono` (mis. `trace_backward(lot_id = FG-1013-07)`), kesimpulan, bar proporsi volume (kandidat sumber merah, sisanya netral) atau tabel lot terdampak, lalu jalur bukti bernomor dengan chip sumber yang menyorot node. Tanpa template yang cocok: state abstain.
- **Graph:** node pill putih bergaris `border`; rantai bukti = node hijau `accent-soft` + garis `accent-fill` tebal; lainnya diredupkan 40%.
- **Gantt (`Timeline`, dipakai Rencana, Bay & Tangki, Filling):** baris dari `PlanView.resources` (Lab test, Bay 1-3, Filling F1/F2/F4); blok membulat `sm`; lab test bergaris putus, bongkar RT abu, CIP arsir hijau keabuan, filling hijau pudar, changeover hijau keabuan, starvation merah pudar, pelanggaran constraint arsir merah bergaris tepi; toggle rencana awal / rekomendasi.
- **Tabel kelayakan constraint:** 6 baris; kolom rencana awal vs rekomendasi; ikon centang hijau atau silang merah + teks "Terpenuhi/Dilanggar" + alasan.
- **Simulasi 3D:** kanvas Three.js selebar halaman, tinggi `clamp(520px, 72dvh, 880px)`; kamera ortografis; tata letak nyata dari `mock/site.ts`; gedung putih matte, atap panel surya bertekstur grid, tanah hijau, pohon instanced; warna unit dari token status, aliran susu `accent-fill`, pin + halo berdenyut untuk bottleneck (mati saat reduced motion). Kontrol: tombol kaca kanan atas (zoom, putar 45°, putar otomatis, seluruh situs, layar penuh), pilihan fungsi seret kiri bawah. Label HTML pill bertingkat: jauh hanya kritis, menengah tanpa label netral, dekat semua.
- **Grafik tren (Recharts, `components/pasokan/line-chart.tsx`):** area satu seri `primary` dengan gradasi 22% → 2%, grid horizontal `border`, sumbu angka bulat (langkah 1/2/2,5/5), tooltip kaca, garis referensi kapasitas putus-putus `status-crit`, tampilan tabel di bawah grafik. Satu sumbu Y; tidak memakai dual-axis.
- **Kartu instruksi, callout, role note:** callout kaca dengan ikon `primary`; `role-note` teks `status-warn` dengan ikon gembok saat peran tidak berizin.
- **Daftar audit, rantai serah-terima batch, konfigurasi unit, matriks hak akses:** baris kaca tipis dengan badge status; langkah celah batch memakai titik `primary` terisi.
- **Context Graph:** SVG force-directed; bentuk node per jenis (lingkaran asal susu, belah ketupat mutu, kotak proses, lingkaran kecil lot); ukuran mengikuti jumlah relasi; relasi rencana putus-putus.
- **Label data simulasi:** chip kecil abu "Data simulasi" di header tiap layar.

## Do's and Don'ts

**Standar UI A1-A8:**

- A1. Tanpa emoji. Ikon hanya lucide-react, stroke 1.75.
- A2. Warna hanya dari token di atas.
- A3. Satu layar satu tugas: Receiving melihat, Simulasi 3D menunjukkan lokasi, Traceability menelusuri, Rencana memutuskan.
- A4. Navigasi fokus: grup jelas, maksimal 4 item per grup, 3 halaman inti selalu terlihat.
- A5. Tanpa elemen tanpa fungsi (tidak ada kartu promosi, ilustrasi dekoratif, atau "How is your business going?" dari referensi).
- A6. Data dapat dibandingkan: angka sejenis rata kanan, satuan konsisten (L, °C, menit), sebelum vs sesudah berdampingan.
- A7. Satu primary hijau per layar; satu kartu hijau gelap per layar.
- A9. Tombol yang tidak boleh dipakai peran aktif tetap terlihat tetapi nonaktif, disertai `RoleNote` yang menyebut peran berwenang.
- A8. Setiap klaim sistem punya sumber yang bisa diklik; angka asumsi diberi label.

**Do:** teks UI tanpa em-dash; rentang pakai "-"; waktu format 24 jam "14.30"; angka format Indonesia "8.400 L", "0,25%".

**Don't:** menyebut skor risiko sebagai peluang rusak; memakai merah untuk aksi utama; menaruh teks hijau `accent-fill` di ukuran < 18px.

**Aksesibilitas:** kontras teks ≥4,5:1, elemen UI ≥3:1; focus ring 2px `focus` + offset 2px; target ≥44px; semua state (hover, active, focus, disabled, loading, empty, error); `aria-label` untuk tombol ikon; `prefers-reduced-motion` mematikan animasi graph.
