# MilkGraph: Panduan Logo

> Disusun 15 Okt 2026. Master SVG ada di folder ini; dibangun ulang dengan `python build.py`.

## Ide

Huruf **m** kecil dari dua lengkung tebal. Kaki kirinya lepas menjadi **node**: data pabrik yang terpisah, terhubung oleh MilkGraph. Satu bentuk, satu ide.

**Konstruksi (grid 256):** lengkung luar r56, lengkung dalam r16, stem 40, node r20, jarak node ke lengkung 40. Wordmark: Onest Bold (700), tracking -2%, huruf sudah diubah menjadi path.

## File

| Kebutuhan | File |
|---|---|
| Logo utama (terang) | `milkgraph-horizontal-color.svg` |
| Logo di latar gelap | `milkgraph-horizontal-on-dark.svg`, atau `-white.svg` |
| Ruang sempit/vertikal | `milkgraph-stacked-*.svg` |
| Simbol saja (avatar, ikon) | `milkgraph-symbol-*.svg` |
| Ikon app | `milkgraph-app-tile.svg`, `web/icon-*.png` |
| Favicon | `web/favicon.svg`, `web/favicon.ico`, `web/head-snippet.html` |
| Satu warna | `-black`, `-white`, `-green` |
| PNG 1200 px | `png/` |
| Presentasi | `board.html`, `slides/` |

## Warna

| Peran | HEX | RGB |
|---|---|---|
| Tinta (m + wordmark) | `#0F2A1D` | 15 42 29 |
| Node | `#008A30` | 0 138 48 |
| Hijau merek (tile, satu warna) | `#00782A` | 0 120 42 |
| Node di latar gelap | `#92D1A0` | 146 209 160 |

Palet hijau terinspirasi warna logo Greenfields; logo, nama, dan aset merek Greenfields tidak dipakai. CMYK/Pantone belum ditentukan: cek proof cetak sebelum produksi.

## Ruang kosong dan ukuran minimum

- **Ruang kosong:** minimal **1 diameter node** di semua sisi logo.
- **Ukuran minimum:** simbol 16 px (favicon); lockup horizontal 96 px lebar layar, 25 mm cetak.

## Latar yang boleh

Putih, kanvas UI `#F4F4F3`, hijau tua `#0F2A1D` (pakai versi on-dark), hijau merek `#00782A` (pakai versi putih). Foto: hanya di area tenang dengan kontras cukup.

## Jangan

- Mengubah warna node menjadi merah/kuning (bentrok dengan warna status UI).
- Memisahkan atau memindahkan node ke posisi lain.
- Meregangkan, memutar, memberi bayangan, gradien, atau outline.
- Menulis ulang "MilkGraph" dengan font lain di lockup.
- Menaruh logo berwarna di atas hijau merek (pakai versi putih).

## Catatan

- Cek merek dagang (PDKI/DJKI, pencarian gambar) belum dilakukan; lakukan sebelum dipakai di luar lomba.
- Onest berlisensi SIL OFL 1.1, boleh untuk logo.
