# MilkGraph
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Next.js 16 App Router, TypeScript strict, Tailwind v4, lucide-react, @xyflow/react (Traceability), SVG force-directed (Context Graph), three 0.170 (Simulasi 3D), Recharts, pnpm. Backend rencana: FastAPI, Neo4j, PostgreSQL, OR-Tools CP-SAT, SimPy, LLM tool-calling. Rujukan: docs/02-PLAN.md, docs/03-ARCHITECTURE.md.

## Users
Planner PPIC, koordinator receiving, supervisor produksi, dan QA/Lab pabrik susu. Peran dipilih lewat kartu akun di sidebar (lib/roles.ts).

## Product Purpose
Mockup interaktif dua problem statement mitra: receiving flow dinamis (antrean RT, bay, CIP, kelayakan rencana terhadap 6 constraint, simulasi 3D dari tata letak plant nyata) dan traceability volume end-to-end (rantai serah-terima batch, genealogi lot, hold/recall). Rekomendasi menunggu persetujuan manusia.

## Capabilities and Constraints
14 halaman berfungsi dengan state demo bersama (lib/demo.ts, localStorage), peran, audit, dan "Atur ulang demo". Data dari mock/scenario.json, mock/ops.ts, mock/site.ts, berlabel Data simulasi. Belum ada backend, login nyata, atau integrasi SCADA/LIMS/weighbridge; kontrak backend sudah ditulis (docs/04-API-CONTRACT.md, docs/05-INTEGRASI-FE-BE.md) dengan fixture di mock/fixtures/. Batas holding time dan toleransi adalah [asumsi]. Target proposal belum diukur.

## Brand Commitments
docs/08-DESIGN.md merupakan otoritas visual. Bahasa Indonesia, Onest dan JetBrains Mono, hijau palet mitra, permukaan kaca lembut dengan soft shadow di atas gradasi hijau tipis, maksimal satu sorotan hijau gelap per layar. Nama mitra tidak tampil di UI.

## Evidence on Hand
Docs 01-05 dan 08 dibaca dan diselaraskan dengan kode (29 Okt 2026). Materi Ideation Bootcamp mitra dicocokkan di 01-PRD §5.4. Tata letak 3D ditelusuri dari citra satelit publik. Tidak ada bukti hasil lapangan.

## Product Principles
Jawaban disertai bukti. Faktor terkait perlu dikonfirmasi. Manusia menyetujui rekomendasi. Data simulasi selalu dilabeli.

## Accessibility & Inclusion
Keyboard, dialog modal native, fokus terlihat, target 44px, reduced motion, responsif 375/768/1440.
