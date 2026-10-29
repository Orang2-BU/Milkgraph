> **Arsip:** rangkuman draf proposal lama. Arah terbaru ada di `01-PRD.md` (MilkGraph, 15 Okt 2026).

# Rangkuman Lengkap Konsep MilkGraph untuk PLAY IT PLUS Deeptech Hackathon 2026

Dokumen ini menggabungkan isi proposal awal dan tambahan konsep dari dosen, dengan penjelasan yang lebih mudah dipahami. MilkGraph adalah gagasan sistem operasional digital untuk industri pengolahan susu dan bahan cair: menghubungkan data pabrik, melacak perjalanan bahan baku hingga produk jadi, menjelaskan gangguan produksi, serta membantu menyusun ulang jadwal berdasarkan kondisi operasional.

Hal terpenting untuk dipahami: kedua dokumen menggambarkan **rencana pengembangan prototipe**, bukan laporan sistem yang sudah diuji di pabrik. Angka manfaat, kemampuan prediksi, kecepatan pelacakan, dan tingkat kesiapan teknologi adalah pernyataan atau target dalam proposal yang masih perlu dibuktikan.

## Daftar isi

1. [Sumber dan cara membaca rangkuman](#1-sumber-dan-cara-membaca-rangkuman)
2. [Gambaran besar proyek](#2-gambaran-besar-proyek)
3. [Identitas dan konteks kompetisi](#3-identitas-dan-konteks-kompetisi)
4. [Alur pabrik yang menjadi objek sistem](#4-alur-pabrik-yang-menjadi-objek-sistem)
5. [Enam masalah operasional](#5-enam-masalah-operasional)
6. [Hubungan antar-masalah dan efek domino](#6-hubungan-antar-masalah-dan-efek-domino)
7. [Pengguna dan kebutuhan mereka](#7-pengguna-dan-kebutuhan-mereka)
8. [Digital Twin Context Graph dan Multi-Agent AI](#8-digital-twin-context-graph-dan-multi-agent-ai)
9. [Fitur pelacakan Graph RAG](#9-fitur-pelacakan-graph-rag)
10. [Fitur analisis akar masalah](#10-fitur-analisis-akar-masalah)
11. [Fitur penjadwalan dinamis dan prioritas finansial](#11-fitur-penjadwalan-dinamis-dan-prioritas-finansial)
12. [Fitur prediksi penurunan kualitas](#12-fitur-prediksi-penurunan-kualitas)
13. [Skema graph dan kebutuhan data](#13-skema-graph-dan-kebutuhan-data)
14. [Arsitektur sistem dan teknologi](#14-arsitektur-sistem-dan-teknologi)
15. [Contoh penggunaan lengkap](#15-contoh-penggunaan-lengkap)
16. [Target manfaat dan cara membuktikannya](#16-target-manfaat-dan-cara-membuktikannya)
17. [Kesiapan teknologi dan dukungan mitra](#17-kesiapan-teknologi-dan-dukungan-mitra)
18. [Pembagian tim](#18-pembagian-tim)
19. [Strategi presentasi dan demo](#19-strategi-presentasi-dan-demo)
20. [Pertanyaan juri dan penajaman jawaban](#20-pertanyaan-juri-dan-penajaman-jawaban)
21. [Penggabungan proposal awal dan tambahan dosen](#21-penggabungan-proposal-awal-dan-tambahan-dosen)
22. [Cakupan prototipe yang disarankan](#22-cakupan-prototipe-yang-disarankan)
23. [Kekurangan dan keputusan yang masih terbuka](#23-kekurangan-dan-keputusan-yang-masih-terbuka)
24. [Pakta integritas dan administrasi](#24-pakta-integritas-dan-administrasi)
25. [Referensi yang tercantum dalam sumber](#25-referensi-yang-tercantum-dalam-sumber)
26. [Glosarium](#26-glosarium)
27. [Rumusan konsep untuk menjelaskan proyek](#27-rumusan-konsep-untuk-menjelaskan-proyek)

## 1. Sumber dan cara membaca rangkuman

### 1.1 Dua dokumen sumber

| Sumber | Peran dalam rangkuman |
|---|---|
| `C:\Users\ASUS\Downloads\Draft Proposal Play IT 2026.docx` | Proposal formal: identitas, tujuan, masalah, fitur utama, target kinerja, kesiapan teknologi, pembagian tim, daftar pustaka, dan pakta integritas. |
| `C:\Users\ASUS\Downloads\konsep1.docx` | Tambahan dari dosen: enam masalah operasional, contoh lintas industri, pemetaan peran graph dan AI, skema entitas, teknologi, strategi demo, dan argumentasi untuk juri. |

Tambahan dosen juga memuat gambar arsitektur yang menghubungkan data sensor/ERP/LIMS dengan Knowledge Graph Engine dan tiga peran AI: Dynamic Scheduler, Traceability Agent, serta Quality Preserver.

### 1.2 Pembedaan jenis informasi

Rangkuman ini membedakan empat hal:

- **Isi sumber:** gagasan, target, dan rancangan yang memang disebutkan dalam salah satu dokumen.
- **Penjelasan sederhana:** uraian untuk membantu memahami istilah dan hubungan antarbagian.
- **Ilustrasi:** contoh alur untuk membayangkan penggunaan; bukan kejadian nyata atau hasil pengujian.
- **Saran penyempurnaan:** usulan dalam rangkuman ini, bukan keputusan resmi dosen, panitia, maupun tim.

Instruksi seperti “gunakan teknologi ini”, “tampilkan fitur ini”, dan contoh jawaban juri dalam dokumen dipahami sebagai **materi arahan konsep**. Dokumen ini tidak menyatakan bahwa implementasi, pemilihan stack, atau integrasi tersebut sudah dilaksanakan.

Tidak ada verifikasi sumber eksternal dalam penyusunan rangkuman ini. Contoh studi industri dan daftar referensi dibahas sebagaimana tercantum dalam dokumen, dengan keterbatasan yang dijelaskan pada bagian referensi.

## 2. Gambaran besar proyek

### 2.1 Nama

Nama produk: **MilkGraph**.

Judul lengkap dalam proposal:

> MilkGraph: Digital Twin Berbasis Context Graph dan Multi-Agent AI untuk End-to-End Traceability, Root-Cause Analysis, dan Dynamic Scheduling pada Industri Pengolahan Susu.

Tambahan dosen juga menawarkan nama alternatif **Graph-Powered Industrial Copilot**. Nama alternatif tersebut merupakan opsi pengemasan konsep; tidak ada penetapan bahwa nama MilkGraph telah diganti.

### 2.2 Penjelasan paling sederhana

Bayangkan sebuah pabrik memiliki banyak catatan: kedatangan truk, hasil pemeriksaan susu, penggunaan tangki, aktivitas mesin, jadwal pembersihan, dan produk yang selesai dikemas. Semua catatan tersebut sering berada di tempat berbeda.

MilkGraph ingin menyatukannya dalam peta hubungan digital. Pengguna kemudian dapat melihat keadaan operasional, bertanya tentang produk atau gangguan, dan memperoleh rekomendasi penjadwalan.

Contoh pertanyaan yang ingin dilayani:

- “Produk ini berasal dari bahan baku supplier mana?”
- “Batch mana yang menggunakan bahan dari Truk A?”
- “Kenapa jalur pengemasan berhenti?”
- “Tangki mana yang siap menerima bahan berikutnya?”
- “Bagaimana jadwal berubah jika satu truk terlambat?”

### 2.3 Tujuan utama

Tujuan proyek dapat dirangkum menjadi lima kebutuhan yang saling terkait:

1. Menghubungkan informasi operasional yang terpisah.
2. Mempercepat pelacakan bahan baku dan produk jadi.
3. Menjelaskan gangguan dengan konteks proses yang lengkap.
4. Menyusun jadwal penerimaan bahan, produksi, dan CIP yang lebih efisien.
5. Mengurangi risiko kerugian akibat keterlambatan, mesin berhenti, dan penurunan kualitas.

### 2.4 Posisi hasil akhir yang direncanakan

Proposal menargetkan **prototipe fungsional dalam simulasi industri susu**. Artinya, tim ingin membuktikan alur kerja menggunakan data dan kondisi simulasi sebelum mengklaim keberhasilan penggunaan di pabrik nyata.

Istilah “autonomous” pada nama menunjukkan arah kemampuan sistem. Namun, batas tindakan otomatis, kewenangan operator, dan apakah sistem boleh mengendalikan mesin belum ditetapkan dalam kedua dokumen.

## 3. Identitas dan konteks kompetisi

| Elemen | Isi dokumen |
|---|---|
| Institusi | Politeknik Negeri Jember. |
| Alamat institusi | Jl. Mastrip PO BOX 164, Jember, Jawa Timur. |
| Tema yang dipilih | Digitalisasi AI Bidang Industrialisasi. |
| Subtema | Optimasi rantai pasok dan manufaktur cair atau liquid bulk processing. |
| Industri utama proposal | Pengolahan susu. |
| Potensi penerapan tambahan | Beverage, CPO, serta industri lain yang mengolah bahan cair dalam jumlah besar. |
| Jumlah anggota yang direncanakan | Tiga orang: satu ketua dan dua anggota. |
| Tanggal pada identitas dan pakta | Jember, 11 Oktober 2026. |
| Konteks program | PLAY IT! PLUS — Deeptech Hackathon 2026, sebagaimana disebut dalam pakta. |
| Mitra yang tertulis | PT Industri Pengolahan Susu, dengan keterangan sebagai skenario problem statement panitia. |

Nama ketua, anggota, nomor identitas, kontak, nama tim, dan tanda tangan masih berupa placeholder. Karena itu, sumber merupakan draft yang belum lengkap secara administratif.

## 4. Alur pabrik yang menjadi objek sistem

### 4.1 Tahapan dasar

Alur yang menjadi dasar konsep dapat dibaca sebagai berikut:

**Supplier → truk pengangkut → penerimaan dan pemeriksaan QC → tangki penyimpanan → pengolahan/pencampuran → pengemasan → produk jadi.**

Pada pabrik susu, proses pengolahan dapat mencakup pasteurisasi dan pencampuran. Pada industri lain, prosesnya dapat berupa formulasi atau tahapan pengolahan cair yang berbeda.

### 4.2 Informasi yang dibutuhkan sepanjang alur

| Tahap | Informasi yang ingin dikaitkan |
|---|---|
| Pengangkutan | Truk, supplier, waktu kedatangan, bahan yang dibawa. |
| Penerimaan | Antrean, penimbangan bila relevan, kapasitas penerimaan. |
| Pemeriksaan QC | Sampel, hasil uji, status lolos/tertahan, durasi pemeriksaan. |
| Penyimpanan | Tangki, volume, kapasitas, suhu, lama bahan berada di tangki. |
| Pengolahan | Batch yang digunakan, resep, waktu proses, fasilitas terkait. |
| Pengemasan | Jalur, kecepatan, status berjalan atau berhenti. |
| Produk jadi | Batch produk, SKU, tanggal produksi, kedaluwarsa, tujuan gudang. |
| Konteks pendukung | Operator, shift, maintenance, dan riwayat pembersihan. |

### 4.3 Mengapa urutan ini penting

Kelancaran setiap tahap bergantung pada kesiapan tahap lain. Truk tidak selalu bisa langsung dibongkar meskipun sudah datang. Tangki belum tentu boleh digunakan hanya karena terlihat kosong. Mesin pengemasan tidak bisa berjalan terus jika pasokan dari proses sebelumnya terputus.

Karena itu, sistem perlu memahami **ketersediaan, hubungan, waktu, dan batas operasional** secara bersamaan.

## 5. Enam masalah operasional

### 5.1 Antrean truk dan pemeriksaan QC yang lama

**Isi sumber:** truk dapat menumpuk di area penerimaan, jembatan timbang, atau laboratorium karena kedatangan dan pemeriksaan belum tersinkronisasi.

Tambahan dosen memberikan contoh pada pabrik kelapa sawit, refineri CPO, pabrik gula, dan dairy plant. Parameter pengujian berbeda menurut industrinya, misalnya FFA dan kadar air pada contoh CPO, atau sampling rendemen pada contoh tebu.

**Penjelasan sederhana:** kedatangan bahan belum diatur mengikuti kemampuan pabrik menerima dan memeriksanya. Akibatnya, banyak kendaraan menunggu pada saat yang sama.

**Dampak yang dibahas:**

- Waktu tunggu panjang.
- Bahan terlambat tersedia untuk produksi.
- Area penerimaan padat.
- Risiko kualitas meningkat untuk bahan yang sensitif terhadap waktu tunggu.

**Peran MilkGraph yang diusulkan:** menghubungkan kedatangan truk, beban laboratorium, status QC, dan kesiapan tangki untuk membantu pengaturan antrean.

### 5.2 Bahan siap tetapi proses berikutnya belum siap

**Isi sumber:** susu mentah sudah diperiksa, tetapi tangki proses masih digunakan batch sebelumnya atau sedang menjalani CIP.

**Penjelasan sederhana:** suatu tahap selesai lebih cepat daripada tahap yang menerima hasilnya. Bahan akhirnya tertahan karena tidak ada fasilitas berikutnya yang siap.

Kondisi ini disebut bottleneck atau ketidakseimbangan proses. Dalam contoh dokumen, penumpukan terjadi pada sisi upstream, yaitu tahap yang lebih awal dalam aliran produksi.

**Dampak yang dibahas:**

- Bahan menunggu lebih lama.
- Fasilitas penerimaan tidak cepat kosong.
- Antrean di depan proses ikut bertambah.
- Jadwal yang terlihat baik pada satu bagian dapat merugikan bagian lain.

**Peran MilkGraph yang diusulkan:** mengetahui status tangki dan fasilitas yang terhubung sebelum merekomendasikan penerimaan atau perpindahan bahan.

### 5.3 Jalur pengemasan kehabisan pasokan

**Isi sumber:** laju filling dan packaging lebih tinggi daripada laju mixing atau formulasi. Tangki pemasok habis sebelum batch berikutnya siap.

**Penjelasan sederhana:** mesin pengemasan bisa bekerja, tetapi tidak memiliki bahan untuk dikemas. Keadaan ini disebut **starvation**.

**Dampak yang dibahas:**

- Mesin berhenti menunggu.
- Waktu produksi efektif berkurang.
- Kapasitas mesin tidak dimanfaatkan secara penuh.
- Target produksi sulit dicapai meskipun mesin tidak rusak.

**Peran MilkGraph yang diusulkan:** menghubungkan kecepatan jalur pengemasan, volume tangki pemasok, serta waktu kesiapan batch berikutnya untuk mendukung penyesuaian jadwal atau aliran bahan.

### 5.4 Urutan changeover dan CIP tidak efisien

**Isi sumber:** pabrik memproduksi banyak varian. Perpindahan antarvarian dapat memerlukan tingkat pembersihan yang berbeda. Contoh yang disebut meliputi rasa lembut ke kuat, warna muda ke tua, dan aturan terkait alergen.

**Penjelasan sederhana:** urutan produksi memengaruhi seberapa berat dan lama pembersihan di antara produk. Jika urutannya kurang tepat, pabrik dapat melakukan pembersihan berat terlalu sering.

**Dampak yang dibahas:**

- Setup time lebih panjang.
- Penggunaan air dan bahan kimia bertambah.
- Mesin lebih lama tidak menghasilkan produk.
- Pergantian produk menimbulkan pemborosan operasional.

**Peran MilkGraph yang diusulkan:** menyimpan aturan perpindahan antarproduk dan memperhitungkannya saat menyusun jadwal.

**Batas penting:** contoh urutan dalam dokumen bukan SOP universal. Aturan kebersihan, kompatibilitas, dan alergen tetap harus mengikuti aturan proses yang digunakan dalam skenario atau pabrik terkait.

### 5.5 Bahan terlalu lama menunggu dan kualitas menurun

**Isi sumber:** bahan yang sensitif dapat mengalami penurunan kualitas jika terlalu lama tertahan. Dokumen memberikan contoh susu, CPO, dan tebu, dengan uraian rinci tentang susu serta penurunan rendemen tebu.

**Penjelasan sederhana:** menunggu bukan hanya masalah waktu. Pada bahan tertentu, keterlambatan juga dapat mengurangi nilai atau membuat bahan tidak memenuhi persyaratan proses.

Untuk susu, dokumen mengaitkan waktu tunggu dengan perubahan keasaman dan kondisi mikrobiologis. Pernyataan tersebut merupakan bagian narasi sumber; dokumen belum memberikan model pengaruh waktu, suhu, dan kondisi penyimpanan secara kuantitatif.

**Peran MilkGraph yang diusulkan:** memperkirakan risiko penurunan mutu berdasarkan kondisi bahan dan memprioritaskan penanganannya.

### 5.6 Traceability sulit karena data tersebar dan bahan bercampur

**Isi sumber:** bahan dari beberapa kendaraan dapat masuk dan bercampur dalam bulk storage tank. Catatannya tersebar di gudang, QC, dan produksi, dalam buku log atau Excel terpisah.

**Penjelasan sederhana:** hubungan dari bahan masuk ke produk keluar tidak mudah ditemukan. Ketika satu sumber bahan bermasalah, pabrik kesulitan menentukan produk mana saja yang memakai bahan itu.

**Dampak yang dibahas:**

- Pelacakan membutuhkan rekap manual.
- Penentuan cakupan produk terdampak lambat.
- Investigasi masalah kualitas lebih sulit.
- Respons terhadap kebutuhan recall tidak cepat.

**Peran MilkGraph yang diusulkan:** menyimpan keterkaitan batch, fasilitas, proses, dan produk dalam graph yang dapat ditelusuri dari kedua arah.

## 6. Hubungan antar-masalah dan efek domino

### 6.1 Contoh rantai gangguan

**Ilustrasi berdasarkan konsep:**

1. Banyak truk datang dalam waktu berdekatan.
2. Laboratorium tidak langsung menyelesaikan semua pemeriksaan.
3. Bahan yang dibutuhkan produksi belum berstatus siap.
4. Tangki pemasok tidak mendapat bahan sesuai jadwal.
5. Jalur pengemasan menghabiskan persediaan yang tersedia.
6. Jalur berhenti karena starvation.
7. Pabrik kehilangan waktu produksi.

Rantai lain dapat terjadi ketika tangki sedang CIP: bahan tertahan di depan proses, area penerimaan belum kosong, dan truk berikutnya ikut menunggu.

### 6.2 Hubungan bukan otomatis bukti sebab-akibat

Menemukan beberapa kejadian yang terhubung membantu investigasi. Namun, klaim bahwa suatu kejadian benar-benar menyebabkan gangguan perlu didukung urutan waktu, kondisi proses, dan bukti yang sesuai.

Karena itu, keluaran sistem perlu membedakan:

- Fakta yang tercatat.
- Hubungan proses yang diketahui.
- Dugaan penyebab yang masih perlu diperiksa.
- Hasil simulasi dari suatu tindakan.

Pembedaan ini merupakan **saran penyempurnaan** agar jawaban sistem tidak melebihi bukti yang tersedia.

## 7. Pengguna dan kebutuhan mereka

### 7.1 Pengguna utama dalam proposal

| Pengguna | Kebutuhan | Contoh keluaran yang relevan |
|---|---|---|
| Manajer operasional | Memahami hambatan dan menentukan prioritas perbaikan. | Ringkasan gangguan, dampak, rekomendasi jadwal. |
| Plant manager | Menilai kondisi keseluruhan dan manfaat perbaikan. | Waktu henti, kondisi kapasitas, estimasi dampak biaya. |
| Tim QA | Melacak bahan dan produk serta menyelidiki masalah mutu. | Asal batch, riwayat QC, daftar produk terkait. |
| Supervisor produksi | Menjaga aliran bahan dan kesiapan fasilitas. | Antrean, status tangki, status jalur, jadwal CIP. |

Tambahan dosen juga menyebut operator, manajemen, dan auditor sebagai calon pengguna pertanyaan bahasa alami.

### 7.2 Pertanyaan yang perlu dijawab antarmuka

Pengguna perlu mengetahui kondisi yang sedang terjadi, data pendukungnya, dan pilihan tindakan. Antarmuka yang dibayangkan dalam dokumen memuat dashboard pemantauan, visualisasi graph, serta modul chat.

**Saran penyempurnaan:** jawaban chat sebaiknya dapat ditautkan kembali ke batch, kejadian, dan status yang menjadi sumbernya, sehingga pengguna bisa memeriksa dasar rekomendasi.

## 8. Digital Twin Context Graph dan Multi-Agent AI

### 8.1 Digital Twin

Dalam konsep ini, Digital Twin adalah representasi digital dari keadaan dan hubungan operasional pabrik. Sistem ingin merekam kapasitas, volume, status alat, alur bahan, dan kejadian proses.

Ini tidak harus berarti membuat model pabrik tiga dimensi. Dokumen lebih menekankan representasi operasional dan semantik: sistem memahami apa yang terhubung, apa yang sedang terjadi, dan apa yang mungkin terdampak.

### 8.2 Context Graph

Context Graph menggabungkan dua unsur:

- **Entitas:** objek seperti truk, batch, tangki, dan mesin.
- **Relasi:** hubungan seperti membawa, disimpan di, memasok, dan menghasilkan.

Contoh:

```text
Truk T-01
  membawa Batch RM-01
    disimpan di Tangki S-01
      memasok Proses MIX-01
        memasok Jalur PKG-01
          menghasilkan Batch Produk FG-01
```

ID di atas hanya ilustrasi dalam rangkuman, bukan dataset nyata.

### 8.3 Multi-Agent AI

Multi-Agent AI dalam dokumen berarti pembagian fungsi AI ke beberapa peran. Gambar arsitektur tambahan dosen menyebut:

1. **Dynamic Scheduler:** penjadwalan prediktif antrean dan urutan CIP.
2. **Traceability Agent:** pelacakan serta tanya jawab kontekstual melalui Graph RAG.
3. **Quality Preserver:** deteksi anomali dan prediksi risiko penurunan kualitas.

Proposal awal juga menekankan analisis akar masalah gabungan dan prioritas finansial. Pembagian agen akhir belum diputuskan: fungsi-fungsi tersebut bisa dikelompokkan atau dipisahkan sesuai desain implementasi.

### 8.4 Peran yang berbeda

| Bagian | Peran |
|---|---|
| Graph | Menyimpan dan menghubungkan fakta operasional. |
| Mesin simulasi | Membentuk kejadian dan perubahan kondisi dalam prototipe. |
| Optimizer | Menghitung jadwal berdasarkan batasan dan tujuan. |
| Model prediksi | Memperkirakan kondisi yang belum terjadi berdasarkan data dan asumsi model. |
| LLM | Memahami pertanyaan dan menyusun penjelasan. |
| Dashboard | Menampilkan kondisi, bukti, dan rekomendasi kepada pengguna. |

Tabel ini merupakan penjelasan fungsi dari konsep gabungan. Ia bukan penetapan arsitektur final yang sudah disepakati.

## 9. Fitur pelacakan Graph RAG

### 9.1 Tujuan

Graph RAG membantu pengguna mendapatkan informasi dari hubungan data operasional melalui pertanyaan bahasa alami.

Proposal memberikan contoh pertanyaan tentang asal bahan baku pada kode produk **JAD-901** dan operator yang bertugas. Tambahan dosen memperluasnya menjadi penelusuran seluruh produk yang menggunakan pasokan dari suatu truk.

### 9.2 Alur yang direncanakan

1. Pengguna mengajukan pertanyaan.
2. AI memahami entitas dan hubungan yang dicari.
3. Pertanyaan diterjemahkan menjadi query graph, misalnya Cypher untuk Neo4j.
4. Database mengembalikan hasil penelusuran.
5. Sistem menyusun jawaban yang dapat dibaca pengguna.

### 9.3 Dua arah traceability

**Backward traceability:** dari produk jadi kembali ke bahan, tangki, proses, dan kendaraan pemasok.

**Forward traceability:** dari bahan atau kendaraan pemasok ke proses dan seluruh produk yang menggunakannya.

Backward membantu mencari asal. Forward membantu menentukan cakupan dampak.

### 9.4 Keluaran yang dibayangkan

- Daftar batch sumber.
- Supplier dan truk yang terkait.
- Tangki serta proses yang dilalui.
- Produk jadi yang terhubung.
- Operator atau shift jika datanya tersedia.
- Hasil QC yang relevan jika diintegrasikan.

### 9.5 Batas klaim

Kedua sumber menggunakan klaim seperti “tanpa halusinasi” atau “bebas halusinasi”. Klaim itu belum disertai pengujian pada dokumen.

**Saran penyempurnaan:** sampaikan bahwa jawaban didasarkan pada hasil query graph, lalu uji apakah terjemahan pertanyaan, hasil query, dan narasinya benar. Jika hubungan tidak tercatat, sistem perlu menyatakan data belum tersedia.

## 10. Fitur analisis akar masalah

### 10.1 Gagasan dalam proposal awal

**Compound Root-Cause Engine** ingin menjelaskan gangguan yang melibatkan beberapa faktor sekaligus.

Contoh sumber: jalur terhenti karena kombinasi pergantian shift operator, variasi bahan baku dari supplier, dan maintenance mesin yang tertunda.

### 10.2 Perluasan dalam tambahan dosen

Tambahan dosen menunjukkan jawaban berbentuk rantai operasional: bahan tertahan di QC, tangki tidak terisi, dan jalur pengemasan mengalami starvation.

Kedua bentuk tersebut saling melengkapi:

- Rantai operasional menjelaskan urutan kejadian.
- Analisis gabungan mencari beberapa kondisi yang mungkin bersama-sama berkontribusi.

### 10.3 Data yang diperlukan

Untuk mendukung contoh-contoh tersebut, sistem membutuhkan lebih dari hubungan fisik. Data waktu, status QC, shift, maintenance, dan perubahan status mesin perlu tersedia serta dapat dihubungkan ke kejadian yang dianalisis.

### 10.4 Keluaran yang disarankan

**Saran penyempurnaan:** setiap analisis dapat berisi:

1. Gangguan yang ditemukan.
2. Kejadian pendahulu yang tercatat.
3. Jalur hubungan yang relevan.
4. Faktor yang diduga berkontribusi.
5. Data yang masih kurang.
6. Tindakan yang bisa diperiksa operator.

Ini membantu membedakan analisis berbukti dari penjelasan yang hanya terdengar masuk akal.

## 11. Fitur penjadwalan dinamis dan prioritas finansial

### 11.1 Apa yang dijadwalkan

Dokumen mengusulkan penjadwalan:

- Kedatangan atau antrean kendaraan.
- Penerimaan bahan ke tangki.
- Urutan produksi.
- Changeover antarproduk.
- CIP.

### 11.2 Mengapa harus dinamis

Kondisi dapat berubah: kendaraan terlambat, hasil QC belum selesai, tangki belum bersih, atau proses sebelumnya belum selesai. Jadwal perlu dihitung ulang ketika perubahan tersebut memengaruhi kelayakan rencana.

### 11.3 Batasan yang disebutkan atau tersirat dalam konsep

| Batasan | Pengaruh terhadap jadwal |
|---|---|
| Kapasitas tangki | Bahan tidak dapat masuk melebihi kapasitas. |
| Status QC | Kesiapan bahan bergantung pada hasil pemeriksaan. |
| Status CIP | Fasilitas belum siap dipakai saat dibersihkan. |
| Urutan produk | Perpindahan produk memengaruhi kebutuhan pembersihan. |
| Lama proses | Tahap berikutnya bergantung pada waktu penyelesaian sebelumnya. |
| Laju pengemasan | Pasokan perlu mendukung kebutuhan jalur. |
| Risiko mutu | Bahan yang sensitif terhadap waktu tunggu perlu dipertimbangkan. |

### 11.4 Pendekatan algoritma yang disebut

Tambahan dosen menyebut **constraint-satisfaction algorithms**, **reinforcement learning**, **genetic algorithm**, dan **operations research** sebagai pendekatan potensial.

Tidak ada algoritma akhir, fungsi tujuan, parameter, atau hasil pembandingan yang sudah ditetapkan dalam sumber. Penyebutan beberapa pendekatan tidak berarti seluruhnya wajib digunakan.

### 11.5 Financial Prioritizer

Proposal awal menambahkan pertimbangan biaya dan ROI agar rekomendasi tidak hanya menunjukkan kondisi teknis, tetapi juga prioritas berdasarkan dampak finansial.

Contohnya, sistem ingin membantu membandingkan dampak bahan menunggu, mesin berhenti, dan waktu CIP. Akan tetapi, dokumen belum memberikan harga bahan, tarif biaya mesin, biaya air/kimia, nilai produksi, atau rumus ROI.

**Saran penyempurnaan:** pada simulasi, seluruh asumsi biaya perlu ditampilkan dan estimasi tidak boleh disajikan sebagai penghematan aktual pabrik.

## 12. Fitur prediksi penurunan kualitas

### 12.1 Tambahan penting dari dosen

Tambahan dosen memberi nama **Early-Warning Quality Decay Model** atau **Predictive Perishability & Quality Anomaly Detection**.

Fitur ini merupakan penajaman dibanding proposal awal, yang sudah menyebut risiko bahan rusak tetapi belum menguraikan model prediksinya secara khusus.

### 12.2 Masukan yang disebut

- Durasi bahan berada di tangki.
- Suhu lingkungan atau kondisi suhu yang relevan.
- Riwayat sampel dan hasil QC.

### 12.3 Keluaran yang dibayangkan

- Peringatan risiko penurunan kualitas.
- Perkiraan kecenderungan degradasi.
- Saran penanganan atau pengalihan aliran sebelum bahan memburuk.

### 12.4 Batas kesiapan

Sumber belum memuat dataset pelatihan, label kualitas, algoritma final, ukuran akurasi, atau metode validasi model.

**Saran penyempurnaan:** jika prototipe hanya memakai aturan simulasi, jelaskan sebagai indikator risiko berbasis aturan/asumsi. Jangan menyebutnya model prediksi yang tervalidasi sebelum ada bukti.

## 13. Skema graph dan kebutuhan data

### 13.1 Entitas utama dari tambahan dosen

| Entitas | Atribut yang disebut | Arti |
|---|---|---|
| `Truck` | `truck_id`, `driver_name`, `arrival_time`, `capacity`, `status` | Kendaraan yang mengangkut bahan. |
| `RawMaterialBatch` | `batch_id`, `material_type`, `initial_volume`, `supplier`, `qc_status`, `moisture_level`, `acidity` | Lot bahan baku dan karakteristiknya. |
| `StorageTank` | `tank_id`, `current_volume`, `max_capacity`, `temperature`, `cleaning_status` | Fasilitas penyimpanan dan kondisinya. |
| `MixingProcess` | `process_id`, `start_time`, `end_time`, `recipe_id`, `line_id` | Aktivitas pencampuran atau pengolahan. |
| `PackagingLine` | `line_id`, `speed_rate`, `status` | Jalur pengemasan. Status contoh: Running, Idle, Starvation, CIP. |
| `FinishedProduct` | `product_batch_id`, `sku`, `production_date`, `expiry_date`, `destination_warehouse` | Batch hasil produksi. |

Proposal awal juga menyebut **OperatorShift** dan **MaintenanceLog**. Keduanya perlu masuk dalam rancangan jika analisis hendak menggunakan operator dan perawatan sebagai faktor.

### 13.2 Relasi yang dituliskan dalam tambahan dosen

| Relasi sumber | Makna |
|---|---|
| `(Truck)-[:BRING_BATCH {timestamp}]->(RawMaterialBatch)` | Truk membawa batch pada waktu tertentu. |
| `(RawMaterialBatch)-[:STORED_IN {residence_time_hours}]->(StorageTank)` | Batch disimpan dalam tangki, dengan informasi lama tinggal. |
| `(StorageTank)-[:SUPPLY_TO]->(MixingProcess)` | Tangki memasok proses. |
| `(MixingProcess)-[:PRODUCES_BUFFER_FOR]->(PackagingLine)` | Proses menyediakan pasokan untuk pengemasan. |
| `(PackagingLine)-[:OUTPUTS]->(FinishedProduct)` | Jalur menghasilkan produk jadi. |
| `(StorageTank)-[:REQUIRES_CIP {last_cleaned_time}]->(StorageTank)` | Relasi CIP yang dituliskan pada skema sumber. |

### 13.3 Hal yang perlu diperjelas pada skema

**Saran penyempurnaan, bukan perubahan yang sudah diputuskan:**

- Hubungan CIP antar-entitas bertipe tangki pada skema sumber belum menjelaskan apakah mengarah ke tangki yang sama atau tangki lain, serta bagaimana satu kejadian pembersihan dicatat.
- Jika satu tangki menerima beberapa batch, perlu catatan kapan dan berapa volume setiap batch masuk atau keluar.
- Jika satu batch produk menggunakan beberapa bahan, kontribusi tiap sumber perlu bisa ditelusuri.
- Data waktu perlu dipertahankan agar kondisi saat kejadian dapat diperiksa, bukan hanya status terakhir.
- Riwayat QC, maintenance, dan shift perlu dihubungkan ke batch, alat, atau kejadian yang tepat.
- Atribut kualitas perlu disesuaikan dengan industri yang digunakan dalam demo. Contoh parameter CPO tidak otomatis menjadi parameter utama susu.

### 13.4 Mengapa riwayat waktu penting

Pertanyaan “Tangki mana yang kosong sekarang?” berbeda dengan “Tangki mana yang kosong ketika jalur berhenti tadi?”. Menyimpan status terakhir saja belum cukup untuk menjawab pertanyaan kedua.

Karena konsep ingin menjelaskan kejadian historis dan melakukan traceability, rancangan data perlu mendukung riwayat perpindahan dan perubahan kondisi.

## 14. Arsitektur sistem dan teknologi

### 14.1 Arsitektur dalam sumber

```text
Data sensor, kedatangan truk, QC, ERP/MES/LIMS
                       |
                       v
             Knowledge/Context Graph
                       |
                       v
     AI pelacakan, analisis, penjadwalan, kualitas
                       |
                       v
            Dashboard, chat, dan rekomendasi
```

Untuk prototipe, data nyata dapat digantikan oleh aliran kejadian simulasi. Integrasi nyata dengan pabrik masih menjadi tahap yang belum dibuktikan.

### 14.2 Pilihan teknologi yang tercantum

| Komponen | Teknologi sumber | Fungsi dalam konsep |
|---|---|---|
| Simulasi data | Python, SimPy, Pandas, FastAPI | Membuat atau menyediakan kejadian truk, tangki, suhu, dan mesin. |
| Graph database | Neo4j; tambahan juga menyebut RDF Graph | Menyimpan entitas dan relasi operasional. |
| Opsi deployment graph | Neo4j AuraDB atau Docker | Pilihan lingkungan menjalankan graph yang disebut dosen. |
| Vector index/embedding | Neo4j Vector Index atau ChromaDB | Menyimpan konteks teks seperti SOP dan troubleshooting. |
| Orkestrasi AI | LangChain atau LlamaIndex | Membantu alur Graph RAG dan agen. |
| Backend API | Python FastAPI | Menghubungkan data, graph, dan layanan AI. |
| Frontend | Streamlit atau React | Dashboard dan interaksi pengguna. |
| Visualisasi graph | Cytoscape.js atau PyVis | Menampilkan simpul dan hubungan secara interaktif. |

Dokumen tambahan menyarankan Streamlit untuk kecepatan pembuatan prototipe hackathon. Ini merupakan rekomendasi dalam sumber, bukan bukti stack telah dipilih.

Ketentuan produk, kuota gratis, dan ketersediaan layanan yang disebut dalam sumber belum diverifikasi pada rangkuman ini.

### 14.3 Sistem industri pendukung

| Sistem | Kepanjangan | Perannya dalam narasi sumber |
|---|---|---|
| YMS | Yard Management System | Mengatur kendaraan dan area penerimaan. |
| LIMS | Laboratory Information Management System | Mengelola sampel, hasil uji, dan status QC. |
| APS | Advanced Planning and Scheduling | Membantu penyusunan jadwal dan urutan produksi. |
| MES | Manufacturing Execution System | Mencatat dan memantau pelaksanaan produksi. |
| ERP | Enterprise Resource Planning | Sumber data perusahaan yang disebut pada arsitektur. |

Penyebutan sistem tersebut menunjukkan jenis data dan fungsi yang ingin dihubungkan. Tidak ada bukti bahwa integrasi dengan produk ERP/MES tertentu sudah tersedia.

### 14.4 Batas antara AI dan perhitungan operasional

Tambahan dosen menekankan agar AI menjadi bagian inti penyelesaian masalah, bukan hanya tampilan chat.

**Penjelasan:** keberhasilan sistem tetap perlu dibuktikan melalui fungsi yang dijalankan, misalnya query yang benar, jadwal yang memenuhi batasan, dan analisis yang memiliki bukti. Nama algoritma yang kompleks tidak menggantikan bukti tersebut.

## 15. Contoh penggunaan lengkap

Seluruh skenario pada bagian ini adalah **ilustrasi**, bukan catatan kejadian atau hasil demo yang sudah diuji.

### 15.1 Pelacakan produk bermasalah

1. Tim QA menemukan masalah pada Batch Produk P-01.
2. Pengguna meminta asal bahan dan riwayat prosesnya.
3. Sistem menelusuri produk ke jalur pengemasan, proses, tangki, dan batch bahan.
4. Sistem menampilkan truk serta supplier yang terhubung.
5. Pengguna meminta daftar produk lain yang memakai batch bahan tersebut.
6. Sistem menjalankan penelusuran maju untuk membantu menentukan cakupan pemeriksaan.

**Nilai yang ingin ditunjukkan:** penelusuran tidak memerlukan pencocokan manual sejumlah file yang terpisah.

### 15.2 Jalur pengemasan berhenti

1. Jalur pengemasan tercatat berhenti.
2. Tangki pemasok kosong.
3. Batch berikutnya belum dirilis QC.
4. Data waktu menunjukkan keterlambatan tersebut terjadi sebelum tangki habis.
5. Sistem menampilkan rantai kejadian beserta bukti.
6. Supervisor menilai apakah rekomendasi jadwal baru layak diterapkan.

**Nilai yang ingin ditunjukkan:** pengguna memahami konteks lintas bagian, bukan hanya melihat status mesin berhenti.

### 15.3 Kendaraan terlambat

1. Jadwal awal bergantung pada bahan dari Truk A.
2. Kedatangan Truk A digeser dua jam dalam simulasi.
3. Sistem memeriksa bahan dan fasilitas alternatif yang tersedia.
4. Optimizer menghitung jadwal yang tetap memenuhi batasan.
5. Dashboard menunjukkan perbandingan jadwal awal dan jadwal baru.

**Batas penting:** jadwal baru tidak selalu dapat menghilangkan semua gangguan. Sistem perlu menunjukkan jika bahan alternatif atau kapasitas memang tidak cukup.

### 15.4 Risiko bahan menunggu

1. Bahan sudah berada di tangki selama periode tertentu.
2. Sistem membaca durasi, suhu, dan data QC yang tersedia.
3. Model atau aturan simulasi menghasilkan indikator risiko.
4. Sistem menyarankan prioritas penanganan yang masih sesuai dengan batas QC dan kesiapan fasilitas.

**Nilai yang ingin ditunjukkan:** keputusan antrean memperhitungkan risiko mutu, bukan hanya urutan kedatangan.

### 15.5 Urutan CIP

1. Pabrik memiliki beberapa varian yang harus diproduksi.
2. Matriks transisi menentukan kebutuhan pembersihan antarvarian.
3. Sistem membandingkan urutan yang layak.
4. Rekomendasi menunjukkan kebutuhan waktu CIP untuk urutan yang dipilih.
5. Hasil dibandingkan dengan urutan awal menggunakan asumsi yang sama.

**Nilai yang ingin ditunjukkan:** pengurangan waktu berasal dari perhitungan dan aturan yang dapat diperiksa.

## 16. Target manfaat dan cara membuktikannya

### 16.1 Target yang tertulis dalam proposal

| Target | Isi proposal | Status bukti |
|---|---|---|
| Kecepatan traceability | Dari hitungan hari menjadi kurang dari 3 detik. | Belum ada hasil uji atau ukuran dataset. |
| Pengurangan downtime/setup akibat CIP | Hingga 25%. | Belum ada baseline dan hasil perbandingan. |
| Pengurangan risiko product decay | Hingga 30%. | Belum ada definisi metrik risiko dan metode validasi. |

Frasa “hingga” menunjukkan target maksimum yang diharapkan dalam proposal, bukan jaminan untuk semua kondisi.

### 16.2 Pengukuran traceability

**Saran penyempurnaan:** tentukan apakah tiga detik dihitung dari eksekusi query database saja atau dari pertanyaan pengguna sampai jawaban selesai tampil. Kedua ukuran tersebut berbeda.

Pengujian juga perlu menyebut jumlah batch, jumlah hubungan, tipe pertanyaan, dan apakah jawaban benar. Respons cepat tetapi salah tidak memenuhi tujuan pelacakan.

### 16.3 Pengukuran pengurangan waktu CIP

**Saran penyempurnaan:** bandingkan jadwal awal dan jadwal hasil optimasi pada kebutuhan produksi serta aturan pembersihan yang sama.

Contoh rumus pelaporan pengurangan waktu, sebagai usulan:

```text
Persentase pengurangan =
(waktu pada jadwal awal - waktu pada jadwal hasil optimasi)
/ waktu pada jadwal awal × 100%
```

Rumus ini merupakan saran penjelasan metrik, bukan rumus yang sudah ditulis dalam proposal. Tetapkan juga apakah waktu yang dibandingkan hanya CIP atau seluruh setup/changeover.

### 16.4 Pengukuran risiko penurunan kualitas

“Risiko turun 30%” belum jelas jika tidak diketahui apa yang dihitung. Pilihan metrik dapat berupa proporsi batch melewati batas waktu simulasi atau jumlah kejadian risiko menurut model yang didefinisikan.

**Saran penyempurnaan:** pilih satu definisi, jelaskan asumsi, dan bedakan indikator simulasi dari mutu yang benar-benar diukur laboratorium.

### 16.5 Estimasi finansial

Estimasi biaya membutuhkan asumsi yang eksplisit. Belum ada dasar angka biaya di dokumen sumber.

**Saran penyempurnaan:** tampilkan sumber atau asumsi nilai bahan, biaya downtime, biaya CIP, dan periode perhitungan. Estimasi penghematan dan ROI perlu dibedakan dari hasil finansial aktual.

## 17. Kesiapan teknologi dan dukungan mitra

### 17.1 Pernyataan TKT

| Tahap | Pernyataan sumber |
|---|---|
| Awal | TKT 3: pembuktian konsep analitis dan eksperimental pada komponen utama Context Graph dan LLM Graph RAG. |
| Target pascahackathon | TKT 5: validasi modul prototipe terintegrasi dalam lingkungan simulasi industri susu. |

Ini adalah posisi dan target yang dinyatakan pengusul. Dokumen belum menyertakan hasil penilaian independen atau bukti pemenuhan seluruh indikator TKT.

### 17.2 Dukungan mitra

Proposal menyatakan penggunaan dataset dan problem statement terbuka yang disediakan panitia. Skenarionya disebut dirancang sesuai operasional manufaktur cair nasional.

Belum dicantumkan:

- Nama perusahaan mitra yang terkonfirmasi.
- Surat kerja sama atau dukungan.
- Akses data operasional nyata.
- Jadwal uji coba di pabrik.
- Persetujuan integrasi dengan sistem atau mesin nyata.

Karena itu, status mitra paling tepat dipahami sebagai **skenario industri dari panitia sebagaimana ditulis dalam proposal**.

### 17.3 Potensi hilirisasi

Proposal membayangkan MilkGraph sebagai modul SaaS Plug-and-Play Digital Twin untuk FMCG cair di Indonesia. Tambahan dosen menekankan sifat modular untuk dairy, CPO, beverage, dan pharma.

Potensi ini belum disertai model harga, pelanggan berkomitmen, biaya integrasi, atau pembuktian bahwa satu konfigurasi dapat langsung dipakai di berbagai industri.

## 18. Pembagian tim

### 18.1 Ketua tim

**Peran sumber:** Team Lead & AI/Graph Architect.

Tanggung jawab:

- Memimpin arah proyek.
- Menyiapkan presentasi dan pitch deck.
- Merancang node dan edge dalam Neo4j.
- Mengembangkan logika Multi-Agent AI.
- Membangun Graph RAG dan Root-Cause Engine.

### 18.2 Anggota pertama

**Peran sumber:** Backend & Data Engineer.

Tanggung jawab:

- Membangun pipeline integrasi data.
- Menyediakan API melalui FastAPI.
- Menyimulasikan sensor tangki, status mesin, dan log kedatangan truk.
- Mengimplementasikan penjadwalan dinamis.
- Menghitung cost impact dan ROI.

### 18.3 Anggota kedua

**Peran sumber:** UI/UX & Frontend Developer.

Tanggung jawab:

- Membuat antarmuka interaktif.
- Mengembangkan visualisasi graph.
- Menampilkan pemantauan antrean dan ketersediaan tangki.
- Membuat modul chat bahasa alami.

### 18.4 Hal yang belum dibagi secara jelas

**Saran penyempurnaan:** tentukan penanggung jawab validasi hasil, model prediksi kualitas, penyusunan dataset simulasi, dokumentasi batas kemampuan, dan persiapan demo yang dapat diulang.

Tambahan prediksi kualitas memperluas pekerjaan tim, sehingga perlu dipastikan tidak hanya menjadi janji fitur tanpa pemilik implementasi yang jelas.

## 19. Strategi presentasi dan demo

### 19.1 Pesan utama yang ingin disampaikan

Tambahan dosen menyarankan agar tim menonjolkan:

- Graph sebagai fondasi konteks operasional.
- Efek domino dari satu gangguan ke tahap lain.
- Kemampuan memberikan rekomendasi berdasarkan kondisi.
- Potensi modular untuk industri bahan cair.

### 19.2 Alur demo yang dituliskan

Dokumen menggunakan contoh durasi presentasi 3–5 menit. Durasi ini merupakan saran di sumber, bukan jadwal resmi panitia yang diverifikasi.

**Tahap pertama: tampilkan masalah.** Dashboard memperlihatkan antrean dan bahan yang tertahan.

**Tahap kedua: tanyakan penyebab.** Contoh pertanyaan sumber: “Kenapa Lini Pengemasan 2 berhenti jam 14:30 tadi?”

**Tahap ketiga: tampilkan hasil penelusuran.** Sistem menjelaskan hubungan antara QC, bahan, tangki, dan starvation.

**Tahap keempat: optimasi.** Tombol “Optimize Schedule & Reroute” menjalankan perhitungan ulang, kemudian memperbarui kondisi simulasi.

### 19.3 Visualisasi graph

Visualisasi membantu menunjukkan bahwa jawaban berasal dari hubungan konkret. Simpul truk, tangki, batch, dan produk menjadi jalur yang dapat dilihat juri.

**Saran penyempurnaan:** fokuskan visualisasi pada jalur yang terkait pertanyaan atau gangguan. Menampilkan seluruh graph tanpa fokus dapat menyulitkan pembaca memahami bukti.

### 19.4 Analisis what-if

What-if berarti mengubah asumsi kondisi dan melihat konsekuensinya. Contoh sumber adalah keterlambatan Truk A dua jam.

**Saran penyempurnaan:** tunjukkan kondisi awal, perubahan yang diberikan, jadwal hasil perhitungan ulang, dan perbandingan metrik. Nyatakan bahwa perubahan itu dijalankan pada simulasi.

### 19.5 Hal yang belum dibuktikan oleh demo

Demo simulasi dapat menunjukkan keterhubungan data dan alur fungsi. Ia belum membuktikan integrasi mesin nyata, validasi mutu laboratorium, penghematan finansial aktual, atau kesiapan penggunaan produksi.

## 20. Pertanyaan juri dan penajaman jawaban

Bagian ini memisahkan **arah jawaban sumber** dari **saran penyempurnaan** agar klaim lebih terukur.

### 20.1 Mengapa menggunakan Knowledge Graph?

**Arah jawaban sumber:** hubungan dari truk hingga produk memerlukan banyak penelusuran; graph menjadikan relasi sebagai dasar model.

**Saran rumusan:** “Kebutuhan utama kami adalah menelusuri hubungan batch, tangki, proses, dan produk dari beberapa arah. Graph dipilih karena sesuai dengan bentuk hubungan tersebut dan dapat menyediakan konteks untuk jawaban sistem. Kecepatan pada dataset kami akan ditunjukkan melalui pengujian.”

Hindari menyatakan SQL selalu lambat tanpa pembandingan pada kebutuhan dan data yang sama.

### 20.2 Apakah AI bisa memberikan jawaban yang salah?

**Arah jawaban sumber:** fakta berasal dari graph, sedangkan LLM menerjemahkan pertanyaan dan menyusun narasi.

**Saran rumusan:** “Kami membatasi jawaban pada data hasil penelusuran graph dan menampilkan sumber pendukungnya. Ketepatan query serta narasi tetap diuji. Jika data tidak tersedia, sistem menyatakan keterbatasannya.”

Rumusan ini tidak menjanjikan semua jawaban selalu benar.

### 20.3 Apa bagian AI selain chat?

**Arah jawaban sumber:** AI diposisikan pada penjadwalan, penelusuran konteks, prediksi kualitas, dan analisis anomali.

**Saran rumusan:** jelaskan fungsi yang benar-benar sudah diimplementasikan dan tunjukkan hasilnya. Jika penjadwalan menggunakan solver atau aturan, sebutkan pendekatan tersebut secara tepat.

### 20.4 Bagaimana membuktikan manfaat?

**Saran tambahan:** bandingkan kondisi sebelum dan sesudah pada skenario yang sama. Laporkan kecepatan pelacakan, ketepatan hasil, waktu CIP, waktu tunggu, dan metrik risiko yang benar-benar dihitung.

### 20.5 Apakah sistem sudah berjalan di pabrik?

**Saran tambahan:** jawab sesuai batas sumber dan hasil kerja nanti: prototipe ditujukan untuk simulasi. Jangan mengubah contoh industri atau problem statement menjadi klaim kemitraan dan uji lapangan.

### 20.6 Seberapa otomatis sistem ini?

**Saran tambahan:** bedakan rekomendasi jadwal, penerapan perubahan pada simulasi, dan pengendalian mesin nyata. Dua dokumen belum menetapkan seluruh batas kewenangan tersebut.

## 21. Penggabungan proposal awal dan tambahan dosen

### 21.1 Persamaan utama

Kedua sumber sepakat pada:

- Masalah data terpisah dalam operasional pabrik.
- Graph sebagai penghubung konteks.
- Pelacakan dari bahan baku ke produk.
- Pertanyaan bahasa alami.
- Penjadwalan antrean dan CIP.
- Dashboard serta visualisasi hubungan.
- Pengembangan prototipe untuk skenario industri bahan cair.

### 21.2 Kontribusi masing-masing sumber

| Aspek | Proposal awal | Tambahan dosen |
|---|---|---|
| Bentuk dokumen | Formal untuk pengajuan. | Penjelasan konsep dan strategi teknis. |
| Fokus industri | Susu. | Susu dengan contoh lintas industri. |
| Masalah | Empat kelompok masalah besar. | Enam masalah dipisahkan dan diuraikan. |
| Analisis gangguan | Compound Root-Cause Engine. | Contoh rantai gangguan operasional melalui graph. |
| Finansial | Prioritas biaya dan ROI. | Tidak diuraikan sedetail penjadwalan dan kualitas. |
| Kualitas | Risiko decay sebagai masalah dan target. | Quality Preserver sebagai fungsi khusus. |
| Data | Contoh relasi serta entitas operator/maintenance. | Enam entitas utama dengan atribut dan edge. |
| Validasi | Target kinerja dan TKT. | Skenario demo, what-if, serta Q&A. |
| Administrasi | Identitas tim dan pakta. | Tidak menjadi fokus. |

### 21.3 Struktur fitur gabungan

Konsep gabungan dapat dipahami sebagai empat fungsi:

1. **Traceability:** melacak bahan dan produk.
2. **Operational diagnosis:** menjelaskan gangguan dan faktor terkait.
3. **Dynamic scheduling:** menyusun ulang antrean dan produksi/CIP.
4. **Quality risk monitoring:** membaca atau memprediksi risiko penurunan mutu.

Pertimbangan biaya dapat menjadi bagian penilaian rekomendasi pada fungsi kedua dan ketiga.

Ini adalah cara merangkum kedua sumber, bukan keputusan bahwa prototipe harus langsung mengimplementasikan seluruh fungsi dengan kedalaman yang sama.

## 22. Cakupan prototipe yang disarankan

Seluruh bagian ini merupakan **saran penyempurnaan**, bukan komitmen yang tertulis dalam sumber.

### 22.1 Fokus satu industri

Gunakan pabrik susu sebagai konteks utama agar parameter QC, alur proses, istilah, dan cerita demo konsisten. Industri lain dapat disebut sebagai potensi pengembangan.

### 22.2 Satu alur yang terhubung

Prioritaskan alur:

**Kejadian simulasi → graph diperbarui → dashboard berubah → pengguna bertanya → bukti ditampilkan → jadwal dihitung ulang → dampak dibandingkan.**

Alur lengkap ini membantu memperlihatkan bahwa fitur-fitur bekerja bersama.

### 22.3 Urutan prioritas yang masuk akal

| Prioritas saran | Fungsi | Bukti yang ditunjukkan |
|---|---|---|
| Pertama | Graph dan pelacakan dua arah. | Asal produk dan daftar produk dari suatu sumber bahan. |
| Kedua | Dashboard serta diagnosis kejadian. | Status berubah dan jalur penyebab yang didukung data. |
| Ketiga | Penjadwalan ulang dengan batasan jelas. | Jadwal layak dan perbandingan waktu sebelum/sesudah. |
| Pengembangan | Indikator risiko kualitas. | Dasar asumsi, masukan, dan keluaran yang transparan. |
| Pengembangan | Estimasi biaya. | Perhitungan dengan asumsi yang dapat diperiksa. |

Model prediksi terlatih, integrasi ERP nyata, dan pengendalian mesin otomatis dapat menjadi tahap lanjutan jika data serta waktu mendukung.

### 22.4 Batas kendali pada prototipe

Saran untuk membuat konsep reviewable: rekomendasi ditampilkan kepada pengguna dan perubahan dijalankan pada simulasi. Ini memberi ruang untuk menilai hasil tanpa menganggap prototipe sudah siap mengendalikan operasi nyata.

## 23. Kekurangan dan keputusan yang masih terbuka

### 23.1 Data dan bukti kebutuhan

Belum ada hasil wawancara pengguna, pengukuran antrean pabrik, riwayat downtime nyata, atau dataset lengkap yang dilampirkan pada sumber.

Perlu ditentukan data panitia apa yang tersedia dan informasi apa yang harus dibuat melalui simulasi.

### 23.2 Algoritma dan ukuran keberhasilan

Belum ada algoritma optimasi akhir, fungsi tujuan, baseline penjadwalan, model prediksi kualitas, ataupun hasil evaluasi.

Perlu ditentukan tujuan yang diutamakan ketika beberapa sasaran bertentangan, misalnya mengurangi CIP tetapi sekaligus menjaga waktu tunggu bahan.

### 23.3 Arsitektur dan konsistensi data

Belum diputuskan:

- Streamlit atau React.
- LangChain atau LlamaIndex.
- Penggunaan vector index.
- Bentuk penyimpanan kejadian historis.
- Representasi CIP, QC, operator, dan maintenance.
- Cara pencatatan batch yang bercampur atau terbagi.

### 23.4 Klaim yang perlu diturunkan menjadi pengujian

| Klaim sumber | Yang perlu dibuktikan |
|---|---|
| Bebas halusinasi | Ketepatan query, jawaban, dan penanganan data kosong. |
| Traceability instan | Waktu respons serta kebenaran hasil pada ukuran data tertentu. |
| Root cause akurat | Bukti waktu dan proses yang mendukung analisis. |
| Jadwal paling optimal | Tujuan, batasan, metode, dan pembanding yang digunakan. |
| Data silo hilang total | Cakupan data yang benar-benar terintegrasi. |
| Plug-and-play lintas industri | Kebutuhan konfigurasi dan integrasi tiap industri. |
| ROI jelas | Asumsi biaya, manfaat, periode, dan metode perhitungan. |

### 23.5 Dokumen pelaksanaan

Sumber belum memuat jadwal pengerjaan terperinci, anggaran, daftar deliverable per tahap, kriteria penerimaan prototipe, maupun rencana uji lapangan.

### 23.6 Konsistensi administratif

Proposal awal menggunakan nomor bagian 1, 2, lalu 5, 6, dan 7. Penomoran perlu diperiksa terhadap template resmi; tidak dapat disimpulkan dari draft apakah bagian 3 dan 4 memang dihilangkan atau tidak diperlukan.

Nama program dan persyaratan perlu dicocokkan kembali dengan dokumen resmi sebelum pendaftaran final. Rangkuman ini tidak melakukan verifikasi aturan kompetisi.

## 24. Pakta integritas dan administrasi

Bagian ini merangkum isi pernyataan dalam proposal, bukan memberikan penilaian hukum atas keberlakuannya.

### 24.1 Orisinalitas karya

Tim menyatakan karya orisinal, bebas plagiarisme, tidak menggunakan karya pihak lain tanpa izin, dan tidak melanggar HKI. Pada butir ini juga disebut karya belum pernah memenangkan pendanaan atau kompetisi sejenis di tempat lain dalam dua tahun terakhir.

### 24.2 Komitmen mengikuti program

Tim menyatakan belum pernah memenangkan kompetisi lain dengan karya yang sama, bersedia mengikuti rangkaian kegiatan sampai selesai, dan memastikan data pendaftaran benar.

Rangkaian yang disebut meliputi bootcamp, seleksi, final hackathon, exhibition, serta inkubasi apabila terpilih.

Dua pernyataan tentang kemenangan sebelumnya memiliki cakupan kata yang berbeda. Persyaratan final perlu mengikuti ketentuan resmi program, bukan disimpulkan hanya dari rangkuman.

### 24.3 Konflik kepentingan

Tim menyatakan tidak memiliki hubungan dengan juri, pakar, panitia, atau penyelenggara yang dapat memengaruhi objektivitas penilaian.

### 24.4 Kerahasiaan

Tim bersedia menjaga kerahasiaan kekayaan intelektual milik tim lain dan mitra industri yang terlibat dalam program.

### 24.5 Kepatuhan dan sanksi yang disebut

Dokumen menyatakan tim akan mematuhi ketentuan hukum dan bersedia menerima konsekuensi jika pernyataan tidak benar atau terjadi pelanggaran.

Sanksi yang disebut mencakup diskualifikasi, pembatalan kepesertaan atau status pemenang, pengembalian hadiah/pendanaan, dan sanksi lain menurut ketentuan yang berlaku. Pada paragraf lanjutan disebut pengembalian dana yang diterima ke kas negara.

### 24.6 Identitas yang harus dilengkapi

- Nama ketua dan anggota.
- Nomor NIM/NIDN/NIP atau identitas yang relevan.
- Nama tim.
- Kontak dan email.
- Jabatan bila berlaku.
- Tanda tangan.

## 25. Referensi yang tercantum dalam sumber

### 25.1 Daftar pustaka proposal awal

Berikut rujukan sebagaimana ditulis dalam proposal; keberadaan dan rincian bibliografinya belum diverifikasi:

1. Neo4j Inc. (2025). *Graph Retrieval-Augmented Generation (GraphRAG) for Enterprise Context Analytics*. Neo4j Technical Documentation.
2. IPB University Journal of Agroindustrial Technology. (2024). *Penjadwalan Produksi dan Seimbang Lintas (Line Balancing) pada Industri Pengolahan Susu Cair*.
3. Jurnal Teknik Industri Universitas Brawijaya. (2023). *Analisis Overall Equipment Effectiveness (OEE) dan Lean Manufacturing untuk Meminimalkan Setup Time dan Changeover*.
4. Russell, S., & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach* (4th ed.). Pearson.

### 25.2 Referensi dalam tambahan dosen

Tambahan dosen menyebut sumber atau jenis studi tentang:

- Pengurangan antrean truk pemasok tebu menggunakan simulasi diskrit, dikaitkan dengan JURMATIS.
- Digitalisasi ParkFleetPro untuk operasional pabrik kelapa sawit, dikaitkan dengan publikasi Atma Jaya.
- Penjadwalan dan line balancing industri susu, dikaitkan dengan IPB/Journal of Agroindustrial Technology.
- OEE pada mesin filling/packaging, dikaitkan dengan Jurnal Rekayasa Sistem Industri serta repositori Brawijaya dan Esa Unggul.
- Lean manufacturing dan pengurangan setup/changeover, dikaitkan dengan JATI UNIK atau Universitas Brawijaya.
- Kualitas mikrobiologis susu akibat waktu tunggu penyimpanan.
- Kerusakan pascapanen tebu akibat keterlambatan penimbangan.
- Traceability bahan baku pada industri olahan, dikaitkan dengan buku pengawasan mutu agroindustri dan jurnal sistem informasi industri.

### 25.3 Batas penggunaan referensi

Sebagian besar rujukan tambahan belum memuat penulis, tahun, volume, halaman, DOI, atau tautan. Karena itu, rangkuman tidak memperlakukannya sebagai bukti studi yang sudah diperiksa.

**Saran penyempurnaan:** lengkapi bibliografi dari publikasi asli, pastikan judul serta temuan cocok, dan gunakan referensi yang benar-benar mendukung klaim proposal.

## 26. Glosarium

| Istilah | Penjelasan mudah |
|---|---|
| Batch/lot | Kelompok bahan atau produk dengan identitas tertentu agar dapat dilacak. |
| Bottleneck | Bagian proses yang membatasi kelancaran atau kapasitas alur keseluruhan. |
| Changeover | Pergantian proses atau varian produk yang memerlukan persiapan. |
| CIP | Clean-In-Place, pembersihan bagian dalam peralatan tanpa membongkarnya. |
| Context Graph | Peta data yang menyimpan objek, hubungan, dan konteks operasional. |
| Cypher | Bahasa query graph yang disebut untuk Neo4j. |
| Data silo | Data yang terpisah antarbagian sehingga sulit digunakan bersama. |
| Digital Twin | Representasi digital keadaan dan hubungan sistem fisik/operasional. |
| Downtime | Waktu fasilitas tidak beroperasi atau tidak menghasilkan sesuai konteks pengukuran. |
| Edge | Hubungan antar-entitas dalam graph. |
| End-to-end traceability | Pelacakan sepanjang perjalanan bahan hingga produk jadi. |
| FIFO | First-In First-Out, mengutamakan yang masuk lebih dahulu. |
| Filling line | Jalur pengisian produk ke kemasan. |
| FMCG | Fast-Moving Consumer Goods, kategori barang konsumsi yang bergerak cepat. |
| Graph RAG | Pendekatan mengambil konteks dari graph untuk membantu sistem menghasilkan jawaban. |
| HKI | Hak Kekayaan Intelektual. |
| IoT | Internet of Things, perangkat/sensor yang menyediakan data kondisi. |
| LLM | Large Language Model, model bahasa untuk memahami dan menghasilkan teks. |
| Node | Entitas atau simpul dalam graph. |
| OEE | Overall Equipment Effectiveness, ukuran efektivitas peralatan yang disebut dalam referensi. |
| Perishability | Sifat bahan yang dapat menurun kualitasnya atau rusak selama waktu tertentu. |
| QC | Quality Control, pemeriksaan kualitas. |
| QA | Quality Assurance, fungsi penjaminan mutu. |
| Recall | Penarikan produk yang terdampak suatu masalah. |
| Residence time | Lama bahan berada pada fasilitas atau tahap tertentu. |
| ROI | Return on Investment, perbandingan manfaat finansial dengan investasi menurut definisi perhitungan yang digunakan. |
| Root-cause analysis | Analisis untuk mencari penyebab mendasar suatu gangguan. |
| SaaS | Software as a Service, perangkat lunak yang disediakan sebagai layanan. |
| Setup loss | Waktu produksi yang hilang karena persiapan atau pergantian proses. |
| SKU | Identitas jenis/varian produk dalam pengelolaan persediaan. |
| Starvation | Kondisi proses atau mesin tidak mendapat pasokan bahan yang dibutuhkan. |
| Throughput | Laju keluaran proses per satuan waktu. |
| TKT | Tingkat Kesiapan Teknologi. |
| Upstream | Tahap yang berada lebih awal dalam aliran produksi. |
| What-if | Analisis dampak ketika suatu kondisi/asumsi diubah. |

## 27. Rumusan konsep untuk menjelaskan proyek

### 27.1 Penjelasan satu kalimat

**MilkGraph adalah prototipe sistem operasional pabrik susu yang menghubungkan data bahan, tangki, proses, dan produk melalui Context Graph untuk mempercepat pelacakan, menjelaskan gangguan, dan membantu penjadwalan ulang.**

### 27.2 Penjelasan kepada orang yang belum memahami teknologi

“Di pabrik susu, catatan truk, hasil laboratorium, tangki, dan produk sering terpisah. Jika mesin berhenti atau produk bermasalah, tim harus mencari hubungan antarcatatan itu secara manual. MilkGraph ingin menyatukannya dalam peta digital, sehingga pengguna dapat melihat alur bahan, menanyakan penyebab gangguan, dan mendapat rekomendasi jadwal berdasarkan keadaan pabrik.”

### 27.3 Penjelasan yang lebih lengkap

“MilkGraph menggunakan Context Graph untuk merepresentasikan hubungan antar-entitas operasional. Graph menjadi sumber konteks bagi pelacakan melalui bahasa alami dan analisis kejadian. Komponen penjadwalan mempertimbangkan status QC, kapasitas tangki, kesiapan proses, dan kebutuhan CIP. Tambahan konsep memperluasnya dengan pemantauan risiko penurunan kualitas. Pengembangan awal ditujukan untuk simulasi pabrik susu; kecepatan, akurasi, manfaat operasional, dan estimasi finansial akan memerlukan pengujian yang terukur.”

### 27.4 Batas yang perlu dipertahankan saat menjelaskan

- Konsep dan target bukan hasil implementasi yang sudah terbukti.
- Contoh lintas industri bukan bukti pelanggan atau kemitraan.
- Graph tidak menggantikan kebutuhan pencatatan data yang lengkap.
- Jawaban AI, analisis penyebab, dan model prediksi tetap perlu diuji.
- Rekomendasi simulasi berbeda dari pengendalian mesin nyata.
- Estimasi manfaat berbeda dari penghematan yang sudah terjadi.

Dengan batas tersebut, kedua sumber membentuk arah yang jelas: membuat hubungan operasional dapat ditelusuri, menggunakan konteks itu untuk menjelaskan masalah, lalu menilai rekomendasi perbaikan melalui prototipe dan pengujian.
