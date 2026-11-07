import {
  LayoutDashboard, Box, Factory, CalendarClock, GitBranch, Settings,
  Truck, ListOrdered, Workflow, Gauge, TestTubeDiagonal,
  Route, Share2, FlaskConical, PackageX, Database, Library, Users,
  type LucideIcon,
} from "lucide-react";

/** `match`: halaman detail tanpa menu sendiri yang tetap menyorot tab ini (mis. /tangki di bawah Kondisi Alat). */
export type NavTab = { label: string; href: string; icon?: LucideIcon; match?: string[] };
export type NavItem = { label: string; hint: string; icon: LucideIcon; tabs: NavTab[] };

/** Tujuh menu utama, sub-menu hanya untuk halaman inti. Menu dengan lebih dari satu tab tampil sebagai sub-menu bercabang di sidebar; URL tiap tab tetap sama seperti sebelumnya. */
export const navigation: NavItem[] = [
  { label: "Beranda", hint: "Ringkasan semua area", icon: LayoutDashboard, tabs: [{ label: "Beranda", href: "/" }] },
  { label: "Simulasi 3D", hint: "Plant dan bottleneck", icon: Box, tabs: [{ label: "Simulasi 3D", href: "/simulasi" }] },
  { label: "Penerimaan", hint: "Truk dan tes lab", icon: Truck, tabs: [{ label: "Antrean Truk", href: "/receiving", icon: ListOrdered }, { label: "Tes Lab", href: "/lab", icon: FlaskConical }] },
  { label: "Operasional", hint: "Alur dan kondisi produksi", icon: Factory, tabs: [{ label: "Alur", href: "/alur", icon: Workflow }, { label: "Kondisi Alat", href: "/kondisi-alat", icon: Gauge, match: ["/tangki", "/filling"] }, { label: "QC Barang Jadi", href: "/qc-produk", icon: TestTubeDiagonal }, { label: "Master Alat", href: "/master-data", icon: Library }] },
  { label: "Rencana", hint: "Kelayakan dan solver", icon: CalendarClock, tabs: [{ label: "Rencana", href: "/rencana", match: ["/pasokan", "/constraint", "/persetujuan"] }] },
  { label: "Traceability", hint: "Riwayat dan asal produksi", icon: GitBranch, tabs: [{ label: "Telusur", href: "/trace", icon: Route }, { label: "Context Graph", href: "/graph", icon: Share2 }, { label: "Hold Produk", href: "/hold", icon: PackageX }] },
  { label: "Pengaturan", hint: "Sumber data dan akses", icon: Settings, tabs: [{ label: "Sumber Data", href: "/sumber-data", icon: Database }, { label: "Pengguna & Peran", href: "/pengguna", icon: Users }] },
];

/** Menu dan tab yang cocok dengan path; jatuh ke Beranda bila tidak ada. */
export function findNav(pathname: string) {
  for (const item of navigation) {
    const tab = item.tabs.find(t => t.href === pathname || t.match?.includes(pathname));
    if (tab) return { item, tab };
  }
  return { item: navigation[0], tab: navigation[0].tabs[0] };
}
