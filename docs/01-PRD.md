# 01 — PRD: MilkGraph

> Context Graph, AI, dan Simulasi 3D untuk Receiving Flow Dinamis dan Traceability Volume End-to-End pada Industri Pengolahan Susu. Diselaraskan dengan `Proposal_MilkGraph.docx` (PLAY IT! PLUS Deeptech Hackathon 2026, Digitalisasi AI Bidang Industrialisasi) dan materi Ideation Bootcamp mitra industri. Lingkup sekarang: **mockup klik-able lengkap 14 halaman** dengan data simulasi; backend menyusul (`03`, `04`, `05`). Diperbarui 29 Okt 2026.

## 1. Ringkasan

MilkGraph adalah sistem pendukung keputusan untuk planner PPIC, koordinator receiving, supervisor produksi, dan tim QA/Lab. Satu prinsip: **graph menyimpan fakta, solver mengambil keputusan, LLM menjelaskan.**

1. **Context Graph (Neo4j):** alur susu dari farm dan Road Tanker (RT) sampai lot barang jadi, lengkap dengan volume, jendela waktu, dan ID batch setiap serah-terima.
2. **Solver (OR-Tools CP-SAT):** memeriksa kelayakan rencana terhadap 6 constraint, lalu menyusun ulang antrean RT, bay, dan CIP saat terjadi gangguan.
3. **Asisten Graph RAG yang aman:** LLM memilih dan mengisi query template terverifikasi (tool-calling), tidak menulis Cypher bebas, dan menampilkan jalur graph sebagai bukti.

Hasil tampil dalam Graph View, Context Graph, dan Simulasi 3D yang memakai tata letak nyata plant. Semua rekomendasi menunggu persetujuan manusia.

## 2. Problem statement (mitra industri, nomor 1 dan 2)

1. **Receiving Flow & Dynamic Plan Visibility.** Status antrean, kesiapan bay, ketersediaan aset, dan kondisi CIP belum terhubung untuk keputusan operasional yang cepat. Rencana dibuat dari pengalaman dan data yang tidak terhubung antar-lini.
2. **End-to-End Milk Traceability.** Serah-terima batch di tengah proses (storage/transfer tank ke processing) belum lengkap, sehingga penelusuran susu dari farm ke barang jadi sulit. Susu dari beberapa RT bercampur dalam satu tangki; saat hasil uji menyimpang, lot terdampak hanya bisa ditelusuri lewat rekap dan perkiraan.

Keduanya sejalan: susu yang tersendat di hulu terasa sampai lini filling, dan susu bermasalah di hilir harus bisa dilacak sampai asalnya. Masalah melibatkan tiga departemen: Farms (pasokan, jadwal kirim, kesiapan mutu), PPIC (menerjemahkan demand, merencanakan, menyeimbangkan jadwal), dan Produksi (receiving, proses, output).

**Angka konteks:** kapasitas 320 t/hari (maks 450), sekitar 13,3 t/jam, utilisasi milk plant sekitar 95% `[study case]`. Kebutuhan susu nasional tumbuh 29,89% per tahun `[riset: proposal]`. Susu mentah 4 °C aman 48-72 jam, 2 °C hingga 96 jam `[riset: Paludetti et al. 2018]`.

## 3. Pengguna

| Persona | Kebutuhan | Layar utama |
|---|---|---|
| Planner PPIC | Rencana shift yang layak, keputusan saat gangguan, kebutuhan susu ke farm | Rencana & What-if, Pasokan & Permintaan, Constraint |
| Koordinator receiving | Urutan RT, bay mana yang siap, RT yang mendekati batas holding time, instruksi bay | Receiving Flow, Bay & Tangki |
| Supervisor produksi | Lokasi bottleneck, pasokan aseptic tank, dampak ke filling | Simulasi 3D, Lini Filling |
| QA/Lab | Hasil lab, lot terdampak dan proporsinya, hold/recall | Traceability, Hasil Lab, Daftar Hold |

## 4. Prinsip produk

1. **Jawaban bisa diaudit.** Setiap angka dan jawaban menunjuk transfer, hasil lab, atau event di graph. Tidak ada template yang cocok → asisten tidak menebak.
2. **Kandidat, bukan vonis.** Trace mundur menghasilkan kandidat sumber; QA memastikan lewat uji ulang.
3. **Kode/solver yang menghitung.** Genealogi dari irisan waktu dan proporsi volume; kelayakan dari constraint. LLM hanya merangkai penjelasan.
4. **Manusia yang memutuskan.** Rekomendasi jadwal, hold, recall, dan rilis lab tidak berlaku sebelum disetujui peran yang berwenang. Aplikasi tidak mengendalikan bay, mesin, atau stok.
5. **Jujur soal data.** Data mockup sintetis, dikalibrasi ke angka tantangan, diberi label `Data simulasi`. Parameter yang belum divalidasi mentor diberi label `[asumsi]`; fungsi gedung 3D diberi label "perkiraan".

## 5. Scope

### 5.1 Peta halaman (14)

| Grup | Halaman | Route | Status mockup | Kontrak BE |
|---|---|---|---|---|
| Operasional | Receiving Flow | `/` | Dibangun | `04` §3 |
| | Simulasi 3D | `/simulasi` | Dibangun | `04` §15 |
| | Bay & Tangki | `/tangki` | Dibangun | `04` §4 |
| | Lini Filling | `/filling` | Dibangun | `04` §4 |
| Perencanaan | Rencana & What-if | `/rencana` | Dibangun | `04` §5-6 |
| | Pasokan & Permintaan | `/pasokan` | Dibangun | `04` §7 |
| | Constraint | `/constraint` | Dibangun | `04` §5 |
| | Riwayat Persetujuan | `/persetujuan` | Dibangun | `04` §11 |
| Traceability | Traceability | `/trace` | Dibangun | `04` §8 |
| | Hasil Lab | `/lab` | Dibangun | `04` §9 |
| | Daftar Hold | `/hold` | Dibangun | `04` §10 |
| Data | Context Graph | `/graph` | Dibangun | `04` §12 |
| | Sumber Data | `/sumber-data` | Dibangun | `04` §13 |
| Sistem | Pengguna & Peran | `/pengguna` | Dibangun | `04` §14 |

Semua halaman berbagi satu state (sekarang `lib/demo.ts` di browser; nanti backend). Keputusan di satu halaman terlihat di halaman lain dan tercatat di Riwayat Persetujuan. Shell: sidebar 5 grup, top bar (chip Data simulasi, shift, notifikasi, avatar), kartu akun untuk ganti peran, Panduan demo dengan "Atur ulang demo".

### 5.2 Peran dan hak akses (`lib/roles.ts`)

| Keputusan | Planner PPIC | Koordinator receiving | Supervisor produksi | QA/Lab |
|---|---|---|---|---|
| Kirim kebutuhan susu ke farm | ya | | | |
| Setujui/tolak rekomendasi rencana | ya | | | |
| Ubah batas constraint | ya | | | |
| Konfirmasi instruksi dari rencana disetujui | | ya (instruksi bay) | ya (instruksi filling) | |
| Ajukan daftar hold | ya | | ya | ya |
| Setujui/tolak/lepas hold | | | | ya |
| Rilis/tolak hasil lab RT | | | | ya |

Pengguna demo: Rina Wulandari (Planner PPIC), Dimas Prasetyo (Koordinator receiving), Hendra Kusuma (Supervisor produksi), Sri Lestari (QA/Lab).

### 5.3 Isi per halaman

**Receiving Flow (`/`)**
- 4 metrik: throughput receiving vs target 13,3 t/jam, waktu putar RT, tunggu lab test, bay aktif.
- State machine RT 7 tahap (Farms, On the way, Sampling, Lab test, Released, Unloading, Stored); lab test tampil sebagai gerbang antrean.
- Kartu sorotan: "Rencana tidak layak, N constraint dilanggar" (N dari rules dan batas tersimpan) atau "Rekomendasi disetujui, RT-26 pindah ke Bay 1"; sisa holding time RT kritis mengikuti batas di Constraint; 3 faktor bersumber.
- Bay dan Raw Milk Buffer; tabel RT (volume, tahap, tunggu, umur susu, suhu) dengan filter tahap; grafik tunggu lab per jam.

**Simulasi 3D (`/simulasi`)**
- Model situs dengan tata letak nyata: gedung, jalan, apron, parkir, IPAL, dan hutan ditelusuri dari citra satelit publik plant susu di Palaan, Ngajum, Malang (Esri World Imagery zoom 19, ±0,3 m/piksel; titik -8.0993468, 112.5497219). Gedung utama ±52 × 216 m, diputar 13°.
- Isi gedung utama (atap bisa disembunyikan) dari utara ke selatan: 3 bay bongkar, Raw Milk Buffer RMT-1..3, degassing, thermal, separator, storage ST-1..6, cream CT-1..3, premix, mixing, 5 jalur UHT-n → AT-n → 2 filler, palletizing dan dispatch. Fungsi gedung lain dan zona proses berlabel perkiraan.
- Toggle rencana awal 14.42 vs rekomendasi proyeksi 15.30; warna status, pin bottleneck, aliran susu animasi; daftar bottleneck yang memfokuskan kamera.
- Kontrol: seret untuk memutar (atau menggeser), klik kanan kebalikannya, zoom ke kursor, tombol putar 45°, putar otomatis, layar penuh, keyboard (panah, Q/E); kemiringan maks 72°; label bertingkat sesuai zoom; reduced motion mematikan animasi.
- UI tidak memakai nama merek; data dari `mock/site.ts`.

**Bay & Tangki (`/tangki`)**
- Instruksi dari rencana yang disetujui untuk koordinator receiving (konfirmasi per instruksi).
- Kartu Bay 1-3 (selesai, RT berikutnya, CIP terakhir/berikutnya), Gantt bongkar dan CIP mengikuti rencana aktif.
- Raw Milk Buffer (level, suhu, sisa kapasitas, jam sejak CIP), log CIP per aset, tangki tengah proses (storage, cream, premix, mixing) dengan status terisi, kosong, CIP, tertahan.

**Lini Filling (`/filling`)**
- Instruksi untuk supervisor produksi.
- Kartu AT-1 dan AT-2 (masuk vs dipakai, selisih, jam kosong; AT-2 kosong 15.50 pada rencana FIFO) dengan dua filler masing-masing.
- Konfigurasi 5 UHT → 5 AT → 10 filler dengan status unit (jalan, CIP, siaga, breakdown, ganti format).
- Gantt F1, F2, F4; matriks changeover SOP.

**Rencana & What-if (`/rencana`)**
- Skenario rencana shift (FIFO) dan what-if "CIP Bay 2 molor 40 menit".
- Kartu sorotan rekomendasi solver: CP-SAT + waktu solve `[simulasi]`; constraint dilanggar, waktu putar RT, starvation filling, RT antre (sebelum → sesudah).
- Tabel 6 constraint (flow rate, maintenance, holding time, downtime & CIP, kapasitas tangki, changeover SOP) untuk rencana awal vs rekomendasi, dihitung dari batas tersimpan.
- Gantt Lab test, Bay 1-3, Filling F1/F2/F4; toggle rencana awal / rekomendasi; alasan perubahan bersumber.
- Setujui (catatan opsional) atau tolak (catatan wajib); hanya Planner PPIC.

**Pasokan & Permintaan (`/pasokan`)**
- Alur Farms ↔ PPIC ↔ Produksi dengan nilai saat ini.
- Grafik tren permintaan produksi dan rencana susu masuk vs kapasitas 320 t/hari (Recharts, tooltip, tampilan tabel) `[simulasi]`.
- Terjemahan rencana produksi per SKU (Big/Medium/Small Pack) ke kebutuhan susu segar termasuk susut 3% `[asumsi]`, dibanding rencana kirim farm dan kapasitas.
- Jadwal kirim dan kesiapan mutu per farm (lolos lab 30 hari, suhu muat, temuan terakhir); planner mengirim kebutuhan ke farm.

**Constraint (`/constraint`)**
- Enam constraint dengan definisi mitra: flow rate (max transfer rate + toleransi jeda), ketersediaan/maintenance (uji maintenance Bay 3), holding time per tahap (farm sampai simpan dingin, buffer sampai thermal), downtime & CIP (jeda setelah CIP, uji breakdown F1), kapasitas tangki, changeover SOP (jumlah maksimum + waktu minimum per transisi).
- Pratinjau kelayakan langsung untuk rencana shift dan what-if; simpan tercatat di audit. Hanya Planner PPIC.

**Riwayat Persetujuan (`/persetujuan`)**
- Jejak audit semua keputusan (rencana, hold, lab, constraint, instruksi) dengan filter jenis dan unduh CSV.

**Traceability (`/trace`)**
- Pemicu QC FG out-of-spec (FG-1013-07, residu antibiotik) dengan trace mundur dan trace maju.
- Tanya graph: input + pertanyaan contoh; jawaban menampilkan query template + parameter; abstain bila tidak ada template.
- Trace mundur: proporsi volume per RT, kandidat sumber (RT-04, 12%) dan hasil lab penerimaannya.
- Trace maju: 5 lot terdampak, 36.100 pak, dibanding 14 lot / 101.200 pak tanpa genealogi volume; lot di gudang = hold, lot terkirim = recall (FG-1013-05).
- Rantai serah-terima batch 7 langkah dari surat jalan sampai lot; serah-terima di transfer tank ST-4 dan mixing MX-2 ditandai sebagai celah yang kini terhubung.
- Graph view berlapis; ajukan hold dan recall ke QA.

**Hasil Lab (`/lab`)**
- Lab test penerimaan RT dan QC barang jadi dengan parameter dan batasnya; QA merilis RT ke receiving atau menolak (alasan wajib); rilis menunggu uji ulang bila status uji ulang; tautan trace untuk QC out-of-spec.

**Daftar Hold (`/hold`)**
- Pengajuan dari Traceability; metrik menunggu QA, hold aktif, perlu recall, cakupan tanpa genealogi.
- QA menyetujui, menolak, atau melepas (alasan wajib untuk tolak dan lepas); laporan genealogi yang bisa dicetak.

**Context Graph (`/graph`)**
- Graf force-directed seluruh node dan relasi (asal susu, mutu & CIP, aset & proses, lot); ukuran node mengikuti jumlah relasi; panel detail dengan arah relasi dan sumber.

**Sumber Data (`/sumber-data`)**
- Enam konektor read-only (Historian SCADA, LIMS, weighbridge, kontroler CIP, MES filling, ERP gudang) dengan uji koneksi, sinkron, dan pemetaan ke node graph.

**Pengguna & Peran (`/pengguna`)**
- Empat pengguna demo, pindah peran, matriks hak akses.

### 5.4 Penyelarasan dengan materi mitra (Ideation Bootcamp)

Materi bertanda tidak untuk disebarluaskan; hanya keputusan yang dicatat di sini.

| Materi | Penerapan |
|---|---|
| Scope Milk Plant (bukan yogurt/keju); Big, Medium, Small Pack | SKU Full Cream, Low Fat, Cokelat, Stroberi dalam 1 L, 250 ml, 200 ml, 105 ml |
| Multi department Farms, PPIC, Production | Pasokan & Permintaan |
| Tren permintaan dan rencana susu masuk naik | Grafik tren `[simulasi]` |
| Milk incoming process 7 tahap | State machine Receiving Flow |
| Konfigurasi: unloading, degassing, raw milk buffer, thermal, separator, 6 storage, 3 cream, premix, mixing, 5 sterilisasi, 5 aseptic tank, 10 filling (1 AT untuk 2 lini) | Lini Filling, Bay & Tangki, Simulasi 3D; F2 dan F4 berbagi AT-2 |
| Titik ketergantungan: RT siap, tangki CIP/terisi, aset hilir bersama, masalah hilir menahan hulu, risiko filling | Constraint, Bay & Tangki, Filling, Rencana |
| 6 configuration constraint | Definisi di Constraint (§5.3) |
| Visibility gap storage/transfer tank | Rantai serah-terima batch dan laporan genealogi |
| Trace back, trace forward, hold/recall, quality genealogy | Traceability, Daftar Hold |

### 5.5 Di luar scope mockup

Backend nyata (Neo4j, CP-SAT, LLM), login, integrasi SCADA/LIMS/weighbridge/MES/ERP, sensor, notifikasi push, ROI. Semua dirancang di `03`-`05`.

## 6. Model data

Model graph, tabel relasional, dan aturan waktu ada di `03-ARCHITECTURE.md` §4. Ringkas:

- **Node:** Farm, RoadTanker (dengan surat jalan), LabResult, Bay, RawMilkBuffer, Thermal, Separator, Storage (transfer tank), Cream, Premix, Mixing, Sterilisasi, Aseptic, Filling, Lot, CIPEvent, MaintenanceWindow.
- **Relasi:** COLLECTED, TESTED, FILLED_INTO, TRANSFER, HANDOFF, CREAM, PREMIX, FILLED, OCCUPIES, PLANNED, RELEASED; semua transfer membawa volume, jendela waktu, dan ID batch (SJ, RMB, STB, MXB, lot FG).
- Alur masuk dimodelkan sebagai state machine per timestamp. Genealogi dari irisan waktu dan proporsi volume, ke belakang (RT, farm) dan ke depan (lot FG, hold/recall).

## 7. Alur demo

1. **Receiving Flow:** antrean RT menumpuk karena lab test 52 menit, Bay 2 sedang CIP, RT-26 mendekati batas holding time.
2. **Rencana & What-if:** rencana FIFO tidak layak (3 constraint dilanggar); rekomendasi memindahkan RT-26 ke Bay 1 dan menjaga F2/F4; planner menyetujui. Coba what-if CIP molor.
3. **Bay & Tangki / Lini Filling:** instruksi muncul; koordinator receiving dan supervisor mengonfirmasi.
4. **Simulasi 3D:** bandingkan lokasi bottleneck sebelum dan sesudah rekomendasi di tata letak nyata.
5. **Traceability:** QC FG out-of-spec → trace mundur ke RT-04 dan Farm Ngadirejo (12%) → trace maju ke 5 lot (1 recall) → rantai serah-terima batch → ajukan hold.
6. **Daftar Hold / Hasil Lab:** QA menyetujui hold dan merilis RT di lab.
7. **Pasokan & Permintaan / Constraint:** planner mengirim kebutuhan ke farm; ubah batas holding time dan lihat dampaknya.
8. **Riwayat Persetujuan:** semua keputusan tercatat dengan peran dan waktu.

Nilai yang diharapkan di setiap langkah: `05-INTEGRASI-FE-BE.md` §7.

## 8. Target kinerja dan cara ukur

Diukur dengan simulator terhadap baseline FIFO; baseline riil divalidasi bersama mentor.

| Target | Status | Cara ukur |
|---|---|---|
| Daftar lot terdampak + proporsi volume < 1 menit setelah hasil QC out-of-spec masuk | `[target, belum diukur]` | Waktu query trace pada N kasus uji |
| Rencana tidak layak terdeteksi sebelum dijalankan, dengan constraint yang dilanggar | `[target, belum diukur]` | Rencana uji dengan pelanggaran yang ditanam |
| Penyusunan ulang antrean RT, bay, CIP < 30 detik per skenario what-if | `[target, belum diukur]` | Waktu solve CP-SAT per skenario |
| Waktu putar RT rata-rata turun minimal 10%; utilisasi bay dan tangki terpantau per jam | `[target, belum diukur]` | FIFO vs solver pada skenario simulator yang sama |

Angka di mockup (waktu solve, waktu putar, jumlah pak, tren) adalah data simulasi, bukan hasil run.

## 9. Risiko

- Parameter kualitas, batas holding time, toleransi, dan matriks changeover belum divalidasi mentor; semua `[asumsi]`.
- Genealogi bergantung pada kelengkapan catatan transfer dan jendela waktu; serah-terima yang hanya tercatat manual membuat proporsi tidak pasti.
- Klaim "bebas halusinasi" tidak dipakai; yang dijanjikan adalah jawaban yang bisa diperiksa dan abstain bila tidak ada template.
- Simulasi 3D memakai tata letak luar yang nyata dari citra satelit, tetapi fungsi gedung dan susunan peralatan di dalamnya perkiraan tim; perlu dikonfirmasi saat kunjungan atau oleh mentor. Kontur lereng diratakan.
- Integrasi FE-BE berisiko miskom; dicegah dengan kontrak `04`, fixture + golden test (`pnpm fixtures`), dan skrip uji `05` §7.
