import { Milk, Truck, Box, Container, Factory, CalendarClock, ListChecks, ClipboardCheck, GitBranch, FlaskConical, PackageX, Share2, Database, Users } from "lucide-react";
export const navigation = [
  { group: "Operasional", label: "Receiving Flow", href: "/", icon: Truck, description: "Alur RT dari farm sampai tangki, diperbarui 14.42" },
  { group: "Operasional", label: "Simulasi 3D", href: "/simulasi", icon: Box, description: "Alur susu, kondisi bay dan tangki, serta lokasi bottleneck." },
  { group: "Operasional", label: "Bay & Tangki", href: "/tangki", icon: Container, description: "Memantau status bay, level Raw Milk Buffer, suhu, dan jadwal CIP per aset." },
  { group: "Operasional", label: "Lini Filling", href: "/filling", icon: Factory, description: "Memantau pasokan aseptic tank, kecepatan, dan changeover setiap mesin filling." },
  { group: "Perencanaan", label: "Rencana & What-if", href: "/rencana", icon: CalendarClock, description: "Cek kelayakan rencana terhadap constraint, lalu susun ulang antrean." },
  { group: "Perencanaan", label: "Pasokan & Permintaan", href: "/pasokan", icon: Milk, description: "Rencana kirim farm, kebutuhan susu dari rencana produksi, dan kapasitas pabrik." },
  { group: "Perencanaan", label: "Constraint", href: "/constraint", icon: ListChecks, description: "Mengatur enam constraint solver: flow rate, maintenance, holding time, CIP, kapasitas tangki, dan changeover." },
  { group: "Perencanaan", label: "Riwayat Persetujuan", href: "/persetujuan", icon: ClipboardCheck, description: "Menelusuri keputusan planner dan QA beserta catatan dan versi rencananya." },
  { group: "Traceability", label: "Traceability", href: "/trace", icon: GitBranch, description: "Telusuri genealogi lot berdasarkan proporsi volume." },
  { group: "Traceability", label: "Hasil Lab", href: "/lab", icon: FlaskConical, description: "Melihat hasil lab test penerimaan dan QC barang jadi dari LIMS." },
  { group: "Traceability", label: "Daftar Hold", href: "/hold", icon: PackageX, description: "Mengelola lot yang diajukan hold atau recall beserta status persetujuan QA." },
  { group: "Data", label: "Context Graph", href: "/graph", icon: Share2, description: "Menjelajahi hubungan farm, RT, tangki, proses, dan lot barang jadi." },
  { group: "Data", label: "Sumber Data", href: "/sumber-data", icon: Database, description: "Menghubungkan SCADA/historian, LIMS, dan weighbridge secara read-only." },
  { group: "Sistem", label: "Pengguna & Peran", href: "/pengguna", icon: Users, description: "Mengatur peran planner PPIC, koordinator receiving, supervisor produksi, dan QA/Lab." },
];
