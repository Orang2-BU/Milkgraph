# Deploy MilkGraph ke Dokploy

## Pilih mode rilis

- **Mock**: frontend Next.js standalone saja, tanpa backend/DB; aksi demo tersimpan di localStorage browser dan tidak sinkron antar-perangkat. Cocok untuk presentasi data simulasi.
- **API demo**: frontend terhubung ke backend Go, PostgreSQL untuk state/audit, dan SSE untuk pembaruan. `NEXT_PUBLIC_DATA_MODE=api` mengaktifkan klien HTTP; jika API gagal, frontend tidak fallback ke data mock. Solver dan konektor eksternal masih simulasi.
- **Live**: backend sudah memvalidasi JWT, tetapi frontend belum menyediakan login/SSO dan issuer token. Jangan buka API demo publik: `X-Demo-Role` memberi pengunjung akses ke berbagai peran. Batasi staging lewat access gateway/VPN sampai autentikasi nyata ada.

Frontend memakai server Next.js standalone dengan `/api/health`. Nilai `NEXT_PUBLIC_*` dibundel saat build: perubahan mode atau URL API wajib rebuild frontend.

## Isi paket

- `Dockerfile`: dependency terkunci lewat `npm ci` + `package-lock.json`; unit test, lint, build; runtime Node 22 Alpine non-root; hanya output standalone dan aset yang disalin.
- `next.config.ts`: `output: "standalone"`.
- `.dockerignore`: dependency lokal, `.next`, Git, `.env*`, dokumen, screenshot tidak masuk konteks build.
- `/api/health`: HTTP 200 dengan `{"status":"ok","service":"milkgraph-frontend"}`; Docker memeriksanya tiap 30 detik.
- `tests/deployment.mjs`: smoke test health, 14 halaman, aset JS/CSS, ikon, dan 404.

Repo masih mempunyai lockfile pnpm untuk pengembangan. Jalur Docker sengaja menggunakan npm dan `package-lock.json`; tidak perlu pnpm/Corepack di VPS. Jika dependency berubah, jangan biarkan kedua lockfile menyimpang. Node lokal 22.16 memerlukan `--experimental-strip-types` untuk test yang mengimpor `.ts`; script `npm test` sudah menyertakannya.

## Pengaturan Dokploy

1. Buat Project/Environment, lalu **Application**, bukan Database atau Compose.
2. Source: pilih repository frontend ini. Branch: `hadooyy` (branch saat paket disiapkan). Build Path: `/` (root repo). Pastikan perubahan deployment sudah ada di remote branch sebelum deploy; setup lokal tidak otomatis terkirim.
3. Build Type: **Dockerfile**.

   | Field | Nilai |
   |---|---|
   | Dockerfile Path | `Dockerfile` |
   | Docker Context Path | `.` |
   | Docker Build Stage | kosong, memakai stage terakhir `runner` |
   | Command/Entrypoint override | kosong |
   | Replicas | `1` untuk awal |

4. Untuk demo UI publik, Build Argument `NEXT_PUBLIC_DATA_MODE=mock`. `NEXT_PUBLIC_API_URL` boleh kosong. Jika tidak diisi, default kode adalah mock. Image menetapkan `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`, `HOSTNAME=0.0.0.0`, `PORT=3000`. Jangan mengubah port tanpa menyesuaikan domain dan healthcheck.
5. Domains: isi domain frontend, Path `/`, Container Port `3000`. Arahkan DNS A ke IP VPS; hapus/perbaiki AAAA yang menunjuk server lain. Aktifkan HTTPS dengan Let's Encrypt setelah DNS benar. Traefik Dokploy menangani TLS; tidak perlu membuka port 3000 langsung ke internet.
6. Volumes, database, Redis, port mapping host: **tidak perlu**. Jangan mount direktori yang menimpa `/app` atau `.next`.
7. Untuk rilis pertama, nonaktifkan Auto Deploy, lalu klik **Deploy** manual. Workflow GitHub Actions hanya menjalankan CI tanpa webhook/deploy; Dokploy tetap menjadi satu-satunya pemilik release. Jika nanti Auto Deploy diaktifkan, batasi ke branch rilis yang sama. Test/lint/build wajib lolos di Dockerfile sebelum image selesai dibuat.
8. Tunggu build dan container berjalan, cek Logs/Monitoring. Build memerlukan unduhan registry npm/Docker serta Google Fonts (`next/font/google`); runtime memakai font yang sudah dibundel. Sediakan headroom RAM saat build; kapasitas pengguna belum di-load-test.

## Staging API demo (setelah frontend mock stabil)

1. Buat PostgreSQL terkelola di Dokploy, aktifkan persistent volume dan backup. Jangan expose port database publik.
2. Buat Application backend dari repo `Milkgraph-Back`: Dockerfile `Dockerfile`, context `.`, container port `8080`.
3. Isi backend dari connection string internal PostgreSQL Dokploy:

   ```text
   DATABASE_URL=<internal-postgresql-url>
   MODE=demo
   CORS_ORIGINS=https://stage.milkgraph.example
   BIND_ADDRESS=:8080
   ```

   `MODE=demo` hanya untuk staging tertutup. `MODE=live` baru boleh aktif setelah SSO/issuer JWT tersedia, dengan `JWT_SECRET` minimum 32 karakter, `JWT_ISSUER`, dan `JWT_AUDIENCE`.
4. Beri backend domain HTTPS terpisah, misalnya `https://api-stage.milkgraph.example`; deploy, lalu cek `GET /readyz` menghasilkan `{"status":"ready"}`.
5. Pada frontend, set **Build Arguments**, lalu rebuild:

   ```text
   NEXT_PUBLIC_DATA_MODE=api
   NEXT_PUBLIC_API_URL=https://api-stage.milkgraph.example
   ```

6. Dari browser, pastikan request menuju API HTTPS tersebut, tidak ke `127.0.0.1`; lakukan satu mutasi rencana dan cek tab kedua refresh lewat SSE. Origin browser harus persis ada di `CORS_ORIGINS`.

Jangan publikasikan API demo. Pasang Cloudflare Access, VPN, atau allowlist IP. Untuk rollback, pilih revision/image frontend atau backend terakhir yang sehat di Dokploy; jangan reset volume PostgreSQL.

## Verifikasi lokal / sebelum rilis

Dari root repo, jalankan berurutan:

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
docker build -t milkgraph-frontend:local .
docker run -d --name milkgraph-smoke -p 127.0.0.1:3101:3000 milkgraph-frontend:local
```

Setelah server siap:

```sh
BASE_URL=http://127.0.0.1:3101 node tests/deployment.mjs
docker inspect --format '{{.State.Health.Status}}' milkgraph-smoke
docker logs milkgraph-smoke
docker rm -f milkgraph-smoke
```

Gunakan nama/port lain jika sudah dipakai. Jangan menghentikan container proyek lain. `npm run build` di Windows menghasilkan artifact Windows; Docker membangun ulang Linux secara terpisah.

Setelah deploy VPS:

```sh
BASE_URL=https://<domain-frontend> node tests/deployment.mjs
```

Buka `/`, `/rencana`, `/trace`, `/simulasi`; coba ganti peran dan satu aksi demo, reload, periksa state tetap tersimpan di browser yang sama. HTTP smoke bukan pengganti tes interaksi browser. `tests/browser.mjs` lama masih mengasumsikan halaman placeholder dan jam tetap, sehingga bukan release gate yang valid untuk UI sekarang.

## GitHub Actions CI

`.github/workflows/ci.yml` berjalan pada push semua branch, pull request, dan manual dispatch. Job `Test & Build` memakai Ubuntu + Node 22, cache npm, `npm ci`, lint, typecheck, seluruh `tests/*.test.mjs` (33 kasus saat panduan ini diperbarui), build Next.js, build Docker, lalu smoke test image yang berjalan.

CI menunggu healthcheck container (maksimum sekitar 60 detik), menguji 14 halaman/aset/404, dan memeriksa runtime non-root. Kegagalan menampilkan log container; cleanup selalu dijalankan. Run lama pada ref yang sama dibatalkan otomatis. Tidak perlu secret; tidak push image atau memicu deploy Dokploy. Tes browser interaktif belum dimasukkan ke CI karena skrip lama masih usang.

Setelah workflow dipush dan run pertamanya muncul, pilih `Test & Build` sebagai required status check di ruleset/branch protection GitHub bila merge harus menunggu CI. Dokploy manual tidak otomatis diblokir status check ini; periksa CI sebelum rilis.

## Gangguan umum / rollback

- **502**: cek container hidup, log startup, Container Port `3000`, binding `0.0.0.0`, tidak ada command override.
- **CSS/JS 404**: runtime harus menyertakan `.next/static`; Dockerfile sudah menyalinnya.
- **Build gagal mengunduh font/package**: cek akses outbound VPS, DNS, proxy/sertifikat. Jangan menyamarkan kegagalan dengan hasil build lokal.
- **State berbeda antar perangkat**: memang localStorage, bukan database. Integrasi backend pekerjaan terpisah sesuai `05-INTEGRASI-FE-BE.md`.
- **Rollback**: simpan image/revisi sebelumnya sebelum rilis. Redeploy image/revisi yang diketahui baik melalui Dokploy; redeploy branch-head saja bukan rollback ke commit lama. Jangan rewrite history branch untuk rollback.

Panduan ini menyiapkan paket, bukan bukti rollout VPS. Deploy publik tetap dijalankan pemilik server. Tidak ada commit/push otomatis.

Referensi: [Dokploy Build Type](https://docs.dokploy.com/docs/core/applications/build-type), [Dokploy Applications](https://docs.dokploy.com/docs/core/applications), [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
