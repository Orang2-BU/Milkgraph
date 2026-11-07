import {
  LayoutDashboard, Box, Factory, CalendarClock, GitBranch, Settings,
  Truck, Gauge, SlidersHorizontal, Milk, ListChecks, ClipboardCheck,
  Route, Share2, FlaskConical, PackageX, Database, Library, Users,
  type LucideIcon,
} from "lucide-react";

/** `match`: halaman detail tanpa menu sendiri yang tetap menyorot tab ini (mis. /tangki di bawah Kondisi Alat). */
export type NavTab = { label: string; href: string; icon?: LucideIcon; match?: string[] };
export type NavItem = { label: string; hint: string; icon: LucideIcon; tabs: NavTab[] };

/** Enam menu utama. Menu dengan lebih dari satu tab tampil sebagai sub-menu bercabang di sidebar; URL tiap tab tetap sama seperti sebelumnya. */
export const navigation: NavItem[] = [
  { label: "Beranda", hint: "Ringkasan semua area", icon: LayoutDashboard, tabs: [{ label: "Beranda", href: "/" }] },
  { label: "Simulasi 3D", hint: "Plant dan bottleneck", icon: Box, tabs: [{ label: "Simulasi 3D", href: "/simulasi" }] },
  { label: "Operasional", hint: "Alur dan kondisi produksi", icon: Factory, tabs: [{ label: "Receiving", href: "/receiving", icon: Truck }, { label: "Kondisi Alat", href: "/kondisi-alat", icon: Gauge, match: ["/tangki", "/filling"] }, { label: "Master Alat", href: "/master-data", icon: Library }] },
  { label: "Rencana", hint: "Kelayakan dan solver", icon: CalendarClock, tabs: [{ label: "Rencana & What-if", href: "/rencana", icon: SlidersHorizontal }, { label: "Pasokan", href: "/pasokan", icon: Milk }, { label: "Constraint", href: "/constraint", icon: ListChecks }, { label: "Riwayat", href: "/persetujuan", icon: ClipboardCheck }] },
  { label: "Traceability", hint: "Lot, lab, dan hold", icon: GitBranch, tabs: [{ label: "Telusur", href: "/trace", icon: Route }, { label: "Context Graph", href: "/graph", icon: Share2 }, { label: "Hasil Lab", href: "/lab", icon: FlaskConical }, { label: "Hold", href: "/hold", icon: PackageX }] },
  { label: "Pengaturan", hint: "Data dan peran", icon: Settings, tabs: [{ label: "Sumber Data", href: "/sumber-data", icon: Database }, { label: "Pengguna & Peran", href: "/pengguna", icon: Users }] },
];

/** Menu dan tab yang cocok dengan path; jatuh ke Beranda bila tidak ada. */
export function findNav(pathname: string) {
  for (const item of navigation) {
    const tab = item.tabs.find(t => t.href === pathname || t.match?.includes(pathname));
    if (tab) return { item, tab };
  }
  return { item: navigation[0], tab: navigation[0].tabs[0] };
}
