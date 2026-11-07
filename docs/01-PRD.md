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

Pengguna demo: Rino Akbar Hanif (Planner PPIC), Dimas Prasetyo (Koordinator receiving), Hendra Kusuma (Supervisor produksi), Sri Lestari (QA/Lab).

### 5.3 Isi per halaman

**Shell (tampil di semua halaman)**
- **Sidebar:** 14 halaman dalam 5 grup, menempel saat halaman di-scroll, bisa diciutkan jadi ikon saja; di HP menjadi drawer.
- **Kartu akun (bawah sidebar) dan avatar:** membuka panel "Masuk sebagai" untuk berganti peran (Planner PPIC, Koordinator receiving, Supervisor produksi, QA/Lab). Peran menentukan tombol keputusan yang aktif di semua halaman.
- **Chip "Data simulasi":** penanda bahwa semua angka adalah data simulasi.
- **Pilih shift:** menampilkan shift aktif (Shift Siang, Rab 14 Okt, 14.00 - 22.00, snapshot 14.42); shift lain belum tersedia di mockup.
- **Notifikasi (angka 3):** rencana shift tidak layak (jumlah pelanggaran mengikuti Constraint), RT-26 mendekati batas holding time, QC FG out-of-spec FG-1013-07; klik membuka buktinya.
- **Panduan demo:** urutan demo dua skenario proposal dan tombol "Atur ulang demo" yang menghapus semua keputusan, hold, konfirmasi, dan perubahan batas di browser.
- **Bukti (`SourceModal`):** setiap chip sumber di halaman mana pun membuka detail bukti (ID, waktu, isi catatan).
- **Footer:** "Snapshot 14.42 WIB".

**Receiving Flow (`/`)**
- 4 metrik: throughput receiving vs target 13,3 t/jam, waktu putar RT, tunggu lab test, bay aktif.
- State machine RT 7 tahap (Farms, On the way, Sampling, Lab test, Released, Unloading, Stored); lab test tampil sebagai gerbang antrean.
- Kartu sorotan: "Rencana tidak layak, N constraint dilanggar" (N dari rules dan batas tersimpan) atau "Rekomendasi disetujui, RT-26 pindah ke Bay 1"; sisa holding time RT kritis mengikuti batas di Constraint; 3 faktor bersumber.
- Tabel RT (volume, tahap, tunggu, umur susu, suhu) dengan filter tahap, berdampingan dengan kartu sorotan.
- Sejak revisi 7 Nov 2026 (satu halaman satu topik), halaman ini bernama Antrean Truk di menu Penerimaan. Kartu Bay dan Raw Milk Buffer tidak lagi diulang di sini karena isinya ada di Bay & Tangki, dan grafik tunggu lab per jam pindah ke Tes Lab. Kartu sorotan memberi tautan ke kedua halaman itu, dan 3 faktornya (lab 52 menit, Bay 2 CIP, holding RT-26) tetap tampil, jadi alur demo langkah 1 tidak berubah.

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

**Riwayat Produksi (`/riwayat-produksi`)** (revisi 7 Nov 2026, poin 8)
- Sub-menu pertama Traceability. Pilih output (produk, tanggal, jam selesai, kode lot), lalu tampil jalur produksi 7 tahap dari rantai serah-terima: jam mulai-selesai, durasi, jeda antarcatatan, asal-tujuan, batch, dan celah yang disambungkan. Panel detail per tahap dengan tombol bukti.
- Bagian "Mutu & tindak lanjut": lot out-of-spec (FG-1013-07) membuka halaman Traceability di atas (`/trace`) untuk trace mundur/maju dan pengajuan hold. `/trace` tidak lagi jadi sub-menu sendiri, tapi tetap ada dan menyorot Riwayat Produksi di sidebar.
- Data simulasi `mock/outputs.ts`: 5 lot UHT Cokelat FG-1013-05 s.d. 09 (rantai scenario.json) dan 1 jalur contoh UHT Stroberi FG-1012-11 selesai 16.00. Belum ada endpoint daftar output di API; jam selesai per lot cokelat belum tercatat.

**Hasil Lab (`/lab`)**
- Lab test penerimaan RT dan QC barang jadi dengan parameter dan batasnya; QA merilis RT ke receiving atau menolak (alasan wajib); rilis menunggu uji ulang bila status uji ulang; tautan trace untuk QC out-of-spec.
- Sejak revisi 7 Nov 2026 dipecah dua: Tes Lab (`/lab`, menu Penerimaan) untuk lab test RT beserta grafik tunggu lab per jam yang dipindah dari Antrean Truk, dan QC Barang Jadi (`/qc-produk`, menu Operasional).

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

### 5.5 Peta fungsi dan pengaruh fitur

Setiap fitur punya satu fungsi, mengambil data dari fitur lain, dan memengaruhi fitur lain. Status: **Jalan** = sudah saling memengaruhi di mockup; **Rencana** = tautan dirancang untuk backend (`04`, `05`) dan belum jalan di mockup.

#### Alur besar

```text
1. DATA        Sumber Data (SCADA, LIMS, weighbridge, CIP, MES, ERP)
                 │ mengisi
2. FAKTA       Context Graph  ·  Hasil Lab  ·  snapshot Receiving / Bay & Tangki / Filling / Pasokan
                 │ diuji oleh
3. ATURAN      Constraint (batas 6 constraint)
                 │ menentukan kelayakan
4. KEPUTUSAN   Rencana & What-if (planner)      Traceability → Daftar Hold (QA)      Hasil Lab (QA)      Pasokan (planner)
                 │ menerbitkan                     │ menahan / menarik lot              │ merilis RT          │ mengirim kebutuhan
5. EKSEKUSI    Bay & Tangki (receiving) · Lini Filling (supervisor) · gudang/distribusi (di luar sistem) · farm
                 │ semua tercatat
6. JEJAK       Riwayat Persetujuan
   TAMPILAN    Receiving Flow dan Simulasi 3D merangkum keadaan dari langkah 2-5
   KENDALI     Pengguna & Peran menentukan siapa boleh melakukan langkah 4-5
```

#### Per fitur

| Fitur | Fungsi | Mengambil dari | Memengaruhi | Status |
|---|---|---|---|---|
| Receiving Flow | Memantau antrean RT, gerbang lab test, bay, buffer; menandai rencana tidak layak | Snapshot RT/bay/buffer, Constraint (batas holding → sisa holding RT-26; jumlah pelanggaran), Rencana (sudah disetujui atau belum) | Mengarahkan ke Rencana dan Bay & Tangki | Jalan |
| | | Hasil Lab (RT dirilis pindah ke tahap Released, RT ditolak keluar antrean) | | Rencana |
| Simulasi 3D | Menunjukkan lokasi bottleneck di tata letak nyata, sebelum vs sesudah rekomendasi | Snapshot bay/yard/silo, Lini Filling (status UHT, AT, filler), Bay & Tangki (tangki tengah) | (tampilan) | Jalan |
| | | Rencana (otomatis tampil "Rekomendasi" setelah disetujui) | | Rencana |
| Bay & Tangki | Status bay, CIP, buffer, tangki tengah; tempat receiving mengonfirmasi instruksi | Rencana (setelah disetujui: jadwal rekomendasi + 5 instruksi pindah bay), log CIP | Riwayat (konfirmasi instruksi) | Jalan |
| Lini Filling | Pasokan aseptic tank, 10 filler, changeover; tempat supervisor mengonfirmasi instruksi | Rencana (setelah disetujui: laju masuk AT-2 naik, F2/F4 tidak berhenti, instruksi F2), konfigurasi unit | Riwayat; Pasokan (jumlah filler yang jalan) | Jalan |
| Rencana & What-if | Menguji rencana FIFO vs rekomendasi solver; planner menyetujui atau menolak | Constraint (batas), snapshot rencana | Receiving (judul kartu), Bay & Tangki dan Filling (instruksi + jadwal aktif), notifikasi, Riwayat | Jalan |
| | | | Simulasi 3D (tampilan aktif) | Rencana |
| Pasokan & Permintaan | Menerjemahkan rencana produksi ke kebutuhan susu, membandingkan dengan rencana kirim farm dan kapasitas; planner mengirim kebutuhan | Rencana produksi per SKU, farm, Lini Filling (filler jalan) | Riwayat | Jalan |
| | | | Farm → rencana kirim → RT "On the way" di Receiving | Rencana |
| Constraint | Menetapkan batas 6 constraint dan melihat dampaknya sebelum disimpan | Definisi constraint, rencana | Rencana (pelanggaran), Receiving (kartu sorotan, sisa holding), notifikasi, Riwayat | Jalan |
| Riwayat Persetujuan | Jejak audit semua keputusan dengan peran dan waktu | Semua aksi tulis | (dibaca; unduh CSV) | Jalan |
| Traceability | Menelusuri asal lot (mundur) dan lot terdampak (maju), rantai serah-terima batch; mengajukan hold/recall | Hasil Lab (QC FG out-of-spec sebagai pemicu), Context Graph, lokasi lot (gudang/terkirim) | Daftar Hold (pengajuan baru), Riwayat | Jalan |
| | | | Context Graph (menyorot jalur yang sedang ditelusuri) | Rencana |
| Hasil Lab | Parameter lab RT dan QC FG; QA merilis atau menolak RT | LIMS | Traceability (tautan "Telusuri lot ini" dari QC out-of-spec), Riwayat | Jalan |
| | | | Receiving (tahap RT), Simulasi 3D (antrean yard) | Rencana |
| Daftar Hold | QA menyetujui, menolak, atau melepas hold; membedakan hold dan recall; laporan genealogi | Traceability (pengajuan, lot, proporsi), lokasi lot | Traceability (status pengajuan), Riwayat | Jalan |
| Context Graph | Menjelajah seluruh fakta dan hubungan (farm sampai lot) | Graph (sama dengan Traceability) | (tampilan) | Jalan |
| Sumber Data | Status konektor read-only dan pemetaannya ke graph | Sistem pabrik | Mengisi semua data di langkah 2 | Rencana (di mockup uji koneksi dan sinkron disimulasikan lokal) |
| Pengguna & Peran | Menentukan peran aktif dan hak keputusan | Matriks izin | Semua tombol keputusan di setiap halaman, nama dan peran di Riwayat | Jalan |

#### Dua alur yang saling memengaruhi

**Issue 01: Receiving flow dan rencana dinamis**
1. Receiving Flow menunjukkan antrean menumpuk (lab 52 menit, Bay 2 CIP, RT-26 mendekati batas).
2. Constraint menentukan batas; Rencana menguji FIFO: 3 dilanggar.
3. Planner menyetujui rekomendasi → Receiving berganti status, Bay & Tangki menerima 5 instruksi pindah bay, Lini Filling menerima instruksi F2/F4.
4. Receiving dan supervisor mengonfirmasi → Riwayat.
5. Simulasi 3D membandingkan bottleneck sebelum dan sesudah.
6. Pasokan & Permintaan menyelaraskan kebutuhan susu dengan rencana kirim farm (hulu dari antrean RT berikutnya).

**Issue 02: Traceability end-to-end**
1. Hasil Lab mencatat QC FG out-of-spec (FG-1013-07).
2. Traceability menelusuri mundur ke RT-04 (12%) dan maju ke 5 lot; rantai serah-terima batch menutup celah di transfer tank.
3. Pengajuan hold/recall masuk ke Daftar Hold.
4. QA memutuskan; status kembali ke Traceability; semua tercatat di Riwayat.
5. Hasil Lab penerimaan RT berikutnya menentukan RT mana yang boleh masuk antrean (kembali ke Issue 01).

#### Tautan yang belum jalan di mockup

| Tautan | Dampak saat demo | Dikerjakan di |
|---|---|---|
| Hasil Lab rilis/tolak → tahap RT di Receiving dan antrean yard 3D | Rilis RT-27 belum memindahkan RT-27 ke Released | Backend `04` §9 (efek samping wajib) |
| Rencana disetujui → tampilan aktif Simulasi 3D | 3D tetap memakai toggle manual | Backend `04` §15 (`/site/status` mengikuti rencana aktif) |
| Pasokan → farm → RT "On the way" | Kebutuhan terkirim hanya tercatat di Riwayat | Backend (rencana kirim farm), `04` §7 |
| Traceability → sorotan Context Graph | Context Graph menampilkan seluruh graph tanpa sorotan | FE saat integrasi |
| Sumber Data → semua data | Uji koneksi dan sinkron masih simulasi | Backend M8, `04` §13 |

### 5.6 Asal fitur (untuk tanya jawab juri)

Kode sumber: **M** = materi Ideation Bootcamp mitra (problem statement dan slide konfigurasi; jangan diperlihatkan karena tidak untuk disebarluaskan), **P** = proposal dan tambahan dosen (`RANGKUMAN-LENGKAP-MILKGRAPH.md`), **T** = keputusan tim sebagai pelengkap alur.

| Fitur | Asal | Dasar |
|---|---|---|
| Receiving Flow | M + P | Issue 01 "Track RT queue & activity"; slide alur susu masuk 7 tahap; proposal §5.1 antrean truk dan pemeriksaan QC yang lama |
| Simulasi 3D | P + M + T | Proposal: Digital Twin dan tampilan Simulasi 3D; isi gedung dari slide konfigurasi proses mitra; tata letak luar ditelusuri tim dari citra satelit |
| Bay & Tangki | M + P | Issue 01 "Show bay / asset / CIP status"; titik "Tank not ready, CIP/occupied"; proposal §5.2 tangki sedang CIP dan pertanyaan "tangki mana yang siap menerima" |
| Lini Filling | M + P | Slide konfigurasi: satu aseptic tank melayani dua lini filling, "filling trouble risk", changeover paper/size/flavor; proposal §5.3 jalur pengemasan kehabisan pasokan |
| Rencana & What-if | M + P | Issue 01 "Support dynamic plan adjustment"; slide "Can the plan run as scheduled?"; proposal §11 penjadwalan dinamis |
| Pasokan & Permintaan | M | Slide "Multi Department Dependent" (Farms, PPIC, Production) dan slide tren permintaan serta rencana susu masuk; tidak ada di proposal |
| Constraint | M + P | Slide enam configuration constraint; proposal §11.3 batasan penjadwalan |
| Riwayat Persetujuan | T (+P) | Turunan prinsip "manusia yang memutuskan"; proposal hanya menyebut auditor sebagai calon pengguna (§7) dan kewenangan operator belum ditetapkan |
| Traceability | M + P | Issue 02 "End-to-End Milk Traceability"; slide trace back/forward dan visibility gap di transfer tank; proposal §9 Graph RAG backward/forward |
| Hasil Lab | M + P | Lab test sebagai gerbang di alur susu masuk; proposal §4.2 data QC (sampel, hasil uji, lolos/tertahan) dan LIMS di arsitektur |
| Daftar Hold | M + P + T | Slide traceability: "Support hold / recall" dan "Quality genealogy … for available / hold"; proposal §5.6 respons recall lambat; alur persetujuan QA dan pemisahan hold/recall dari tim |
| Context Graph | P | Proposal §8.2 Context Graph dan visualisasi graph (§14.2, §19.3) |
| Sumber Data | P | Arsitektur proposal §14: data sensor, ERP, LIMS, MES, YMS masuk ke knowledge graph |
| Pengguna & Peran | P + T | Persona proposal §7.1; matriks izin dari tim karena proposal belum menetapkan kewenangan |
| Shell: notifikasi, shift, Panduan demo | T | Pelengkap demo dan penanda kondisi shift |

Jawaban singkat bila ditanya asal Daftar Hold: "Hold dan recall diminta mitra sebagai tindak lanjut traceability. Kami menuangkannya sebagai daftar hold yang diputuskan QA, supaya keputusan tetap di tangan manusia dan didukung genealogi batch lengkap."

### 5.7 Penjelasan sederhana per fitur

Untuk orang yang belum paham istilah pabrik atau teknologi. Bayangkan MilkGraph sebagai ruang kendali pabrik susu: susu datang dari peternakan, diperiksa, disimpan, diolah, dikemas, lalu dikirim.

| Fitur | Buat apa | Contoh | Dipakai | Pengaruhnya |
|---|---|---|---|---|
| Receiving Flow | Melihat truk susu yang antre masuk dan bagian yang macet | Lab memeriksa 52 menit, satu tempat bongkar sedang dibersihkan, susu di truk RT-26 hampir kedaluwarsa | Petugas penerimaan | Mengarahkan ke Rencana untuk dicari solusinya |
| Simulasi 3D | Melihat pabrik dalam 3D supaya kelihatan di mana masalahnya | Mesin pengemas F2 dan F4 merah karena kehabisan susu; bentuk pabrik meniru aslinya dari foto satelit | Supervisor, juri | Hanya tampilan |
| Bay & Tangki | Melihat tempat bongkar dan tangki: siap, penuh, atau sedang dibersihkan | Perintah "RT-26 bongkar di Bay 1 jam 15.15" lalu ditekan Konfirmasi | Petugas penerimaan | Konfirmasi tercatat di Riwayat |
| Lini Filling | Menjaga mesin pengemas tidak berhenti karena kehabisan susu | Tangki AT-2 mengisi dua mesin; kalau kosong jam 15.50, dua mesin berhenti | Supervisor | Konfirmasi tercatat di Riwayat |
| Rencana & What-if | Mengecek jadwal hari ini bisa jalan atau tidak, lalu memilih jadwal yang lebih baik | Jadwal biasa melanggar 3 aturan, usulan sistem 0 dengan memindahkan RT-26 ke Bay 1 | Planner | Setelah disetujui, perintah muncul di Bay & Tangki dan Lini Filling |
| Pasokan & Permintaan | Menghitung susu yang dibutuhkan dari target produksi dan membandingkan dengan kiriman peternakan | Butuh 278.659 L, peternakan mengirim 310.800 L, cukup | Planner | Pengiriman kebutuhan tercatat di Riwayat |
| Constraint | Mengatur aturan main pabrik: batas waktu tunggu susu, isi tangki, waktu bersih-bersih | Batas tunggu diturunkan, usulan jadwal jadi melanggar 1 aturan | Planner | Hasil di Rencana dan halaman awal ikut berubah |
| Riwayat Persetujuan | Buku catatan semua keputusan: siapa, apa, kapan, kenapa | "Rekomendasi disetujui oleh Rina, 14.43" | Semua, auditor | Hanya mencatat; bisa diunduh |
| Traceability | Saat ada produk bermasalah, mencari asal susunya dan produk lain yang tercampur | Susu cokelat mengandung antibiotik; 12% susunya dari truk RT-04; 5 lot lain ikut terkena | Petugas lab | Pengajuan penahanan masuk Daftar Hold |
| Hasil Lab | Melihat hasil pemeriksaan susu tiap truk dan produk jadi | Susu RT-27 lolos semua pemeriksaan, boleh dibongkar | Petugas lab | Produk bermasalah bisa langsung dilacak di Traceability |
| Daftar Hold | Memutuskan produk mana yang ditahan di gudang dan mana yang ditarik dari pasar | 4 lot masih di gudang ditahan, 1 lot sudah ke Sidoarjo ditarik | Petugas lab | Status kembali ke Traceability, tercatat di Riwayat |
| Context Graph | Peta hubungan semua data: peternakan ke truk ke tangki sampai produk | Garis dari Farm Ngadirejo ke RT-04 ke tangki RMT-2 | Semua, juri | Hanya tampilan |
| Sumber Data | Menunjukkan dari sistem pabrik mana data diambil | Alat ukur tangki, lab, timbangan truk, mesin, gudang; aplikasi hanya membaca | Tim IT, juri | Menjadi sumber semua data setelah ada backend |
| Pengguna & Peran | Mengatur siapa boleh memutuskan apa | Hanya planner menyetujui jadwal, hanya petugas lab menahan produk | Semua | Tombol keputusan di semua halaman aktif/nonaktif sesuai peran |

Dua alur besar dalam bahasa sederhana:
1. **Truk antre:** halaman awal menunjukkan truk menumpuk → Constraint berisi aturannya → Rencana mencarikan jadwal yang lebih baik → planner setuju → petugas Bay & Tangki dan Lini Filling menjalankan → tercatat di Riwayat.
2. **Produk bermasalah:** Hasil Lab menemukan produk bermasalah → Traceability melacak asal dan produk lain yang tercampur → diajukan ke Daftar Hold → petugas lab memutuskan ditahan atau ditarik → tercatat di Riwayat.

Prinsipnya: sistem memberi saran dan bukti, manusia yang memutuskan.

### 5.8 Di luar scope mockup

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
5. **Traceability:** Riwayat Produksi (FG-1013-07 terpilih, jalur produksinya tampil) → Mutu & tindak lanjut → QC FG out-of-spec → trace mundur ke RT-04 dan Farm Ngadirejo (12%) → trace maju ke 5 lot (1 recall) → rantai serah-terima batch → ajukan hold.
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
