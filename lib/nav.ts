import { LayoutDashboard, Box, Factory, CalendarClock, GitBranch, Settings, type LucideIcon } from "lucide-react";

export type NavTab = { label: string; href: string };
export type NavItem = { label: string; hint: string; icon: LucideIcon; tabs: NavTab[] };

/** Enam menu utama. Menu dengan lebih dari satu tab menampilkan bar tab di atas halaman; URL tiap tab tetap sama seperti sebelumnya. */
export const navigation: NavItem[] = [
  { label: "Beranda", hint: "Ringkasan semua area", icon: LayoutDashboard, tabs: [{ label: "Beranda", href: "/" }] },
  { label: "Simulasi 3D", hint: "Plant dan bottleneck", icon: Box, tabs: [{ label: "Simulasi 3D", href: "/simulasi" }] },
  { label: "Pabrik", hint: "RT, tangki, filling", icon: Factory, tabs: [{ label: "Receiving", href: "/receiving" }, { label: "Bay & Tangki", href: "/tangki" }, { label: "Lini Filling", href: "/filling" }] },
  { label: "Rencana", hint: "Kelayakan dan solver", icon: CalendarClock, tabs: [{ label: "Rencana & What-if", href: "/rencana" }, { label: "Pasokan", href: "/pasokan" }, { label: "Constraint", href: "/constraint" }, { label: "Riwayat", href: "/persetujuan" }] },
  { label: "Traceability", hint: "Lot, lab, dan hold", icon: GitBranch, tabs: [{ label: "Telusur", href: "/trace" }, { label: "Context Graph", href: "/graph" }, { label: "Hasil Lab", href: "/lab" }, { label: "Hold", href: "/hold" }] },
  { label: "Pengaturan", hint: "Data dan peran", icon: Settings, tabs: [{ label: "Sumber Data", href: "/sumber-data" }, { label: "Pengguna & Peran", href: "/pengguna" }] },
];

/** Menu dan tab yang cocok dengan path; jatuh ke Beranda bila tidak ada. */
export function findNav(pathname: string) {
  for (const item of navigation) {
    const tab = item.tabs.find(t => t.href === pathname);
    if (tab) return { item, tab };
  }
  return { item: navigation[0], tab: navigation[0].tabs[0] };
}
