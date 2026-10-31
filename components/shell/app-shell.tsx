"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Check, ChevronDown, ChevronsLeft, ChevronsRight, Menu, X, CircleHelp, ArrowUpRight, Clock3, RotateCcw } from "lucide-react";
import { navigation, findNav } from "@/lib/nav";
import { scenario } from "@/lib/data";
import { Badge, Icon, Modal, SourceModal } from "@/components/ui";
import { resetDemo, setRole, useDemo } from "@/lib/demo";
import { ROLE_IDS, ROLES } from "@/lib/roles";
import { violations } from "@/lib/rules";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [panel, setPanel] = useState<"notifications" | "profile" | "help" | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const current = findNav(pathname);
  const demo = useDemo();
  const me = ROLES[demo.role];
  const broken = violations(scenario.plans[0], "before", demo.limits);
  useEffect(() => {
    if (!drawer) return;
    const node = drawerRef.current;
    const trigger = menuButton.current;
    const overflow = document.body.style.overflow;
    node?.showModal();
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(min-width: 768px)");
    const close = () => { if (media.matches) setDrawer(false); };
    media.addEventListener("change", close);
    return () => { node?.close(); document.body.style.overflow = overflow; media.removeEventListener("change", close); trigger?.focus(); };
  }, [drawer]);
  function renderNavigation(mobile = false) {
    return <>
      <div className="brand-row"><Link href="/" className="brand" aria-label="MilkGraph, Beranda" onClick={() => setDrawer(false)}><svg className="brand-symbol" viewBox="44 60 184 136" aria-hidden="true"><path fill="var(--color-surface-inverse)" d="M44 116A56 56 0 0 1 156 116V196H116V116A16 16 0 0 0 84 116H44ZM116 196V116A56 56 0 0 1 228 116V196H188V116A16 16 0 0 0 156 116V196Z" /><circle fill="var(--color-accent-fill)" cx="64" cy="176" r="20" /></svg><span className="nav-label">MilkGraph<span className="brand-caption">Dairy operations</span></span></Link>{mobile && <button className="icon-button" aria-label="Tutup menu" onClick={() => setDrawer(false)}><Icon icon={X} /></button>}</div>
      <nav aria-label="Navigasi utama" className="nav-list">{navigation.map(item => { const active = item === current.item; return <Link key={item.label} href={item.tabs[0].href} className={`nav-item ${active ? "active" : ""}`} title={`${item.label}: ${item.hint}`} aria-label={item.label} aria-current={active ? "page" : undefined} onClick={() => setDrawer(false)}><span className="nav-icon"><Icon icon={item.icon} size={22} /></span><span className="nav-label nav-text"><span>{item.label}</span><small>{item.hint}</small></span></Link>; })}</nav>
      <div className="sidebar-bottom"><button className="nav-item help" onClick={() => { setDrawer(false); setPanel("help"); }} aria-label="Panduan demo"><span className="nav-icon"><Icon icon={CircleHelp} size={22} /></span><span className="nav-label">Panduan demo</span></button><button className="account" onClick={() => { setDrawer(false); setPanel("profile"); }} aria-label={`Lihat akun ${me.user}, ganti peran`}><span className="avatar">{me.initials}</span><span className="account-copy nav-label"><strong>{me.user}</strong><span>{me.label}</span></span><Icon icon={ChevronDown} size={15} className="nav-label" /></button></div>
    </>;
  }
  return <div className={`app-frame ${collapsed === null ? "auto-sidebar" : collapsed ? "collapsed" : "expanded"}`}>
    <a className="skip-link" href="#main-content">Lewati ke konten</a>
    <aside className="sidebar" id="desktop-navigation">{renderNavigation()}</aside>
    <div className="workspace">
      <header className="topbar"><div className="topbar-start"><button className="icon-button desktop-toggle" aria-label="Buka atau ciutkan sidebar" aria-expanded={collapsed === null ? undefined : !collapsed} aria-controls="desktop-navigation" onClick={() => setCollapsed(collapsed === null ? window.innerWidth >= 1200 : !collapsed)}><Icon icon={collapsed === false ? ChevronsLeft : ChevronsRight} /></button><button ref={menuButton} className="icon-button mobile-menu" aria-label="Buka menu" aria-expanded={drawer} aria-controls="mobile-navigation" onClick={() => setDrawer(true)}><Icon icon={Menu} /></button><span className="breadcrumb">{current.item.tabs.length > 1 ? <>{current.item.label}<span>/</span><strong>{current.tab.label}</strong></> : <strong>{current.item.label}</strong>}</span></div><div className="topbar-actions"><Badge>Data simulasi</Badge><span className="shift-label"><Icon icon={Clock3} size={16} /><span>Shift Siang<span className="shift-date">, Rab 14 Okt</span></span></span><button className="icon-button notification" aria-label="Lihat 3 notifikasi" onClick={() => setPanel("notifications")}><Icon icon={Bell} /><span>3</span></button></div></header>
      <main id="main-content" tabIndex={-1}>{current.item.tabs.length > 1 && <nav className="section-tabs" aria-label={`Bagian ${current.item.label}`}>{current.item.tabs.map(tab => <Link key={tab.href} href={tab.href} className={tab === current.tab ? "selected" : ""} aria-current={tab === current.tab ? "page" : undefined}>{tab.label}</Link>)}</nav>}{children}</main>
      <footer className="workspace-footer"><span>MilkGraph <span className="footer-divider">/</span> Context graph operasional pabrik susu</span><span>Snapshot 14.42 WIB <span className="status-dot" /></span></footer>
    </div>
    {drawer && <dialog ref={drawerRef} id="mobile-navigation" aria-label="Menu navigasi" className="mobile-drawer" onCancel={() => setDrawer(false)} onClick={e => { if (e.target === e.currentTarget) setDrawer(false); }}><div className="drawer-content">{renderNavigation(true)}</div></dialog>}
    {panel && <Modal title={{ notifications: "Notifikasi operasional", profile: "Masuk sebagai", help: "Panduan demo" }[panel]} onClose={() => setPanel(null)}>
      {panel === "notifications" && <div className="notification-list">{[{ title: "Rencana shift tidak layak", subtitle: `${broken} constraint dilanggar · cek rekomendasi solver`, id: "PLAN-FIFO" }, { title: "RT-26 mendekati batas holding time", subtitle: "Tersisa 1j 10m · menunggu bay", id: "HOLD-RT26" }, { title: "QC FG out-of-spec FG-1013-07", subtitle: "Residu antibiotik · jalankan trace", id: "LAB-8812" }].map(n => <button key={n.id} onClick={() => { setPanel(null); setSource(n.id); }}><span><strong>{n.title}</strong><span>{n.subtitle}</span></span><Icon icon={ArrowUpRight} /></button>)}</div>}
      {panel === "profile" && <><p className="muted">Peran menentukan tombol yang aktif. Planner menyetujui rencana, QA/Lab menyetujui hold dan hasil lab.</p><div className="role-list">{ROLE_IDS.map(id => <button key={id} className={`role-option ${demo.role === id ? "selected" : ""}`} aria-pressed={demo.role === id} onClick={() => { setRole(id); setPanel(null); }}><span className="avatar">{ROLES[id].initials}</span><span><strong>{ROLES[id].user}</strong><span>{ROLES[id].label}</span></span>{demo.role === id && <Icon icon={Check} size={16} />}</button>)}</div><p className="small muted">Persetujuan hanya berlaku dalam simulasi. Aplikasi tidak mengendalikan bay, mesin, atau stok nyata. <Link className="inline-link" href="/pengguna" onClick={() => setPanel(null)}>Lihat hak akses per peran</Link></p></>}
      {panel === "help" && <><p>Dua skenario demo dari proposal, dari temuan sampai keputusan.</p><ol className="guide-list"><li><strong>Beranda dan Receiving</strong><p>Lihat antrean RT menumpuk di lab test dan Bay 2 yang sedang CIP.</p></li><li><strong>Rencana</strong><p>Rencana FIFO ditandai tidak layak. Bandingkan rekomendasi solver, lalu setujui atau tolak.</p></li><li><strong>Simulasi 3D</strong><p>Bandingkan lokasi bottleneck sebelum dan sesudah rekomendasi.</p></li><li><strong>Traceability</strong><p>Dari QC FG out-of-spec, trace mundur ke RT dan farm, lalu trace maju untuk daftar hold.</p></li></ol><Badge>Semua data adalah simulasi</Badge><button className="button secondary wide reset-demo" onClick={() => { resetDemo(); setPanel(null); }}><Icon icon={RotateCcw} size={16} />Atur ulang demo</button><p className="small muted">Menghapus keputusan, hold, konfirmasi, dan perubahan constraint yang tersimpan di browser ini.</p></>}
    </Modal>}
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
