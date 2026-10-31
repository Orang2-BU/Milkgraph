"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Check, ChevronDown, ChevronsLeft, ChevronsRight, Menu, X, CircleHelp, ArrowUpRight, Clock3, RotateCcw } from "lucide-react";
import { navigation } from "@/lib/nav";
import { scenario } from "@/lib/data";
import { Badge, Icon, Modal, SourceModal } from "@/components/ui";
import { resetDemo, setRole, useDemo } from "@/lib/demo";
import { ROLE_IDS, ROLES, type Role, type RoleId } from "@/lib/roles";
import { violations } from "@/lib/rules";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import type { Tone } from "@/mock/types";

interface Meta {
  schemaVersion: "1";
  mode: "demo" | "live";
  date: string;
  now: string;
  horizon: { start: string; end: string; nowOffset: number };
  snapshotLabel: string;
}

interface Session {
  user: { name: string; role: string; initials: string; shift: string };
  role: RoleId;
  permissions: string[];
}

interface Shift {
  id: string;
  label: string;
  window: string;
  date: string;
  selected: boolean;
  available: boolean;
}

interface Notification {
  id: string;
  title: string;
  subtitle: string;
  sourceId: string;
  tone: Tone;
}

interface RolesPayload {
  roles: Record<RoleId, Role>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [panel, setPanel] = useState<"shift" | "notifications" | "profile" | "help" | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);

  const menuButton = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const current = navigation.find(n => n.href === pathname) ?? navigation[0];
  const demo = useDemo();

  const metaRes = useResource<Meta>(API_MODE ? "/meta" : null);
  const shiftsRes = useResource<Shift[]>(API_MODE ? "/shifts" : null);
  const notificationsRes = useResource<Notification[]>(API_MODE ? "/notifications" : null);
  const sessionRes = useResource<Session>(API_MODE ? "/session" : null);
  const rolesRes = useResource<RolesPayload>(API_MODE ? "/roles" : null);

  const me = API_MODE && sessionRes.data?.user
    ? { user: sessionRes.data.user.name, label: sessionRes.data.user.role, initials: sessionRes.data.user.initials }
    : (ROLES[demo.role] ?? { user: demo.role, label: demo.role, initials: demo.role.slice(0, 2).toUpperCase() });

  const broken = violations(scenario.plans[0], "before", demo.limits);

  const shifts = API_MODE ? (shiftsRes.data ?? []) : null;
  const selectedShift = shifts?.find(s => s.selected) ?? shifts?.[0];
  const shiftButtonLabel = selectedShift ? selectedShift.label : "Shift Siang";
  const shiftButtonDate = selectedShift ? `, ${selectedShift.date}` : ", Rab 14 Okt";

  const notifications = API_MODE ? (notificationsRes.data ?? []) : null;
  const notifCount = API_MODE ? (notifications ? notifications.length : 0) : 3;

  const snapshotFooter = API_MODE && metaRes.data ? metaRes.data.snapshotLabel : "Snapshot 14.42 WIB";
  const scenarioDate = API_MODE && metaRes.data ? metaRes.data.date : scenario.date;

  const roleIds: RoleId[] = API_MODE && rolesRes.data?.roles ? (Object.keys(rolesRes.data.roles) as RoleId[]) : ROLE_IDS;
  const roleMap: Record<RoleId, Role> = API_MODE && rolesRes.data?.roles ? rolesRes.data.roles : ROLES;

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

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      setResetError(null);
      await resetDemo();
      setPanel(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengatur ulang demo";
      setResetError(msg);
    } finally {
      setResetting(false);
    }
  };

  const handleSetRole = async (id: RoleId) => {
    try {
      setRoleError(null);
      setSwitchingRole(id);
      await setRole(id);
      setPanel(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah peran";
      setRoleError(msg);
    } finally {
      setSwitchingRole(null);
    }
  };

  function renderNavigation(mobile = false) {
    return <>
      <div className="brand-row"><Link href="/" className="brand" aria-label="MilkGraph, Receiving Flow" onClick={() => setDrawer(false)}><svg className="brand-symbol" viewBox="44 60 184 136" aria-hidden="true"><path fill="var(--color-surface-inverse)" d="M44 116A56 56 0 0 1 156 116V196H116V116A16 16 0 0 0 84 116H44ZM116 196V116A56 56 0 0 1 228 116V196H188V116A16 16 0 0 0 156 116V196Z" /><circle fill="var(--color-accent-fill)" cx="64" cy="176" r="20" /></svg><span className="nav-label">MilkGraph<span className="brand-caption">Dairy operations</span></span></Link>{mobile && <button className="icon-button" aria-label="Tutup menu" onClick={() => setDrawer(false)}><Icon icon={X} /></button>}</div>
      <nav aria-label="Navigasi utama">{(Array.from(new Set(navigation.map(n => n.group))) as string[]).map(group => <div className="nav-group" key={group}><p className="group-title nav-label">{group}</p>{navigation.filter(n => n.group === group).map(item => <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`} title={item.label} aria-label={item.label} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setDrawer(false)}><span className="nav-icon"><Icon icon={item.icon} size={19} /></span><span className="nav-label">{item.label}</span>{item.label === "Insiden" && <span className="nav-count nav-label">1</span>}</Link>)}</div>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item help" onClick={() => { setDrawer(false); setPanel("help"); }} aria-label="Panduan demo"><span className="nav-icon"><Icon icon={CircleHelp} size={19} /></span><span className="nav-label">Panduan demo</span></button><button className="account" onClick={() => { setDrawer(false); setPanel("profile"); }} aria-label={`Lihat akun ${me.user}, ganti peran`}><span className="avatar">{me.initials}</span><span className="account-copy nav-label"><strong>{me.user}</strong><span>{me.label}</span></span><Icon icon={ChevronDown} size={15} className="nav-label" /></button></div>
    </>;
  }

  return <div className={`app-frame ${collapsed === null ? "auto-sidebar" : collapsed ? "collapsed" : "expanded"}`}>
    <a className="skip-link" href="#main-content">Lewati ke konten</a>
    <aside className="sidebar" id="desktop-navigation">{renderNavigation()}</aside>
    <div className="workspace">
      <header className="topbar"><div className="topbar-start"><button className="icon-button desktop-toggle" aria-label="Buka atau ciutkan sidebar" aria-expanded={collapsed === null ? undefined : !collapsed} aria-controls="desktop-navigation" onClick={() => setCollapsed(collapsed === null ? window.innerWidth >= 1200 : !collapsed)}><Icon icon={collapsed === false ? ChevronsLeft : ChevronsRight} /></button><button ref={menuButton} className="icon-button mobile-menu" aria-label="Buka menu" aria-expanded={drawer} aria-controls="mobile-navigation" onClick={() => setDrawer(true)}><Icon icon={Menu} /></button><span className="breadcrumb">Workspace<span>/</span><strong>{current.label}</strong></span></div><div className="topbar-actions"><Badge>Data simulasi</Badge><button className="shift-button" onClick={() => setPanel("shift")}><Icon icon={Clock3} size={16} /><span>{shiftButtonLabel}<span className="shift-date">{shiftButtonDate}</span></span><Icon icon={ChevronDown} size={14} /></button><button className="icon-button notification" aria-label={`Lihat ${notifCount} notifikasi`} onClick={() => setPanel("notifications")}><Icon icon={Bell} /><span>{notifCount}</span></button><button className="avatar top-avatar" aria-label={`Lihat profil ${me.user}, ganti peran`} onClick={() => setPanel("profile")}>{me.initials}</button></div></header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer className="workspace-footer"><span>MilkGraph <span className="footer-divider">/</span> Context graph operasional pabrik susu</span><span>{snapshotFooter} <span className="status-dot" /></span></footer>
    </div>
    {drawer && <dialog ref={drawerRef} id="mobile-navigation" aria-label="Menu navigasi" className="mobile-drawer" onCancel={() => setDrawer(false)} onClick={e => { if (e.target === e.currentTarget) setDrawer(false); }}><div className="drawer-content">{renderNavigation(true)}</div></dialog>}
    {panel && <Modal title={{ shift: "Pilih shift", notifications: "Notifikasi operasional", profile: "Masuk sebagai", help: "Panduan demo" }[panel]} onClose={() => setPanel(null)}>
      {panel === "shift" && (
        <>
          <p className="muted">Skenario tersedia untuk {scenarioDate}.</p>
          {API_MODE && shiftsRes.loading && !shifts && (
            <p className="muted" role="status">Memuat data shift…</p>
          )}
          {API_MODE && shiftsRes.error && (
            <p className="crit-text" role="alert">Gagal memuat shift: {shiftsRes.error.message}</p>
          )}
          {API_MODE && shifts && shifts.length === 0 && (
            <p className="muted">Tidak ada data shift.</p>
          )}
          {shifts ? (
            shifts.map(s => (
              <button key={s.id} className="shift-choice" onClick={() => setPanel(null)} disabled={!s.available}>
                <strong>{s.label}</strong>
                <span>{s.window}</span>
                {s.selected && <Badge tone="ok">Dipilih</Badge>}
              </button>
            ))
          ) : (
            <button className="shift-choice" onClick={() => setPanel(null)}>
              <strong>Shift Siang</strong>
              <span>14.00 - 22.00 · Snapshot 14.42</span>
              <Badge tone="ok">Dipilih</Badge>
            </button>
          )}
          <p className="small muted">Shift lain belum tersedia di mockup.</p>
        </>
      )}
      {panel === "notifications" && (
        <>
          {API_MODE && notificationsRes.loading && !notifications && (
            <p className="muted" role="status">Memuat notifikasi…</p>
          )}
          {API_MODE && notificationsRes.error && (
            <p className="crit-text" role="alert">Gagal memuat notifikasi: {notificationsRes.error.message}</p>
          )}
          {API_MODE && notifications && notifications.length === 0 && (
            <p className="muted">Tidak ada notifikasi aktif.</p>
          )}
          {notifications ? (
            <div className="notification-list">
              {notifications.map(n => (
                <button key={n.id} onClick={() => { setPanel(null); setSource(n.sourceId); }}>
                  <span><strong>{n.title}</strong><span>{n.subtitle}</span></span>
                  <Icon icon={ArrowUpRight} />
                </button>
              ))}
            </div>
          ) : (
            <div className="notification-list">
              {[
                { title: "Rencana shift tidak layak", subtitle: `${broken} constraint dilanggar · cek rekomendasi solver`, id: "PLAN-FIFO" },
                { title: "RT-26 mendekati batas holding time", subtitle: "Tersisa 1j 10m · menunggu bay", id: "HOLD-RT26" },
                { title: "QC FG out-of-spec FG-1013-07", subtitle: "Residu antibiotik · jalankan trace", id: "LAB-8812" },
              ].map(n => (
                <button key={n.id} onClick={() => { setPanel(null); setSource(n.id); }}>
                  <span><strong>{n.title}</strong><span>{n.subtitle}</span></span>
                  <Icon icon={ArrowUpRight} />
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {panel === "profile" && <>
        <p className="muted">Peran menentukan tombol yang aktif. Planner menyetujui rencana, QA/Lab menyetujui hold dan hasil lab.</p>
        {roleError && <p className="small crit-text" role="alert" style={{ marginBottom: "0.5rem" }}>{roleError}</p>}
        <div className="role-list">
          {roleIds.map(id => {
            const r = roleMap[id];
            if (!r) return null;
            const active = demo.role === id;
            const isPending = switchingRole === id;
            return (
              <button
                key={id}
                className={`role-option ${active ? "selected" : ""}`}
                aria-pressed={active}
                disabled={isPending}
                onClick={() => void handleSetRole(id)}
              >
                <span className="avatar">{r.initials}</span>
                <span><strong>{r.user}</strong><span>{r.label}</span></span>
                {active && <Icon icon={Check} size={16} />}
              </button>
            );
          })}
        </div>
        <p className="small muted">Persetujuan hanya berlaku dalam simulasi. Aplikasi tidak mengendalikan bay, mesin, atau stok nyata. <Link className="inline-link" href="/pengguna" onClick={() => setPanel(null)}>Lihat hak akses per peran</Link></p>
      </>}
      {panel === "help" && <><p>Dua skenario demo dari proposal, dari temuan sampai keputusan.</p><ol className="guide-list"><li><strong>Receiving Flow</strong><p>Lihat antrean RT menumpuk di lab test dan Bay 2 yang sedang CIP.</p></li><li><strong>Rencana & What-if</strong><p>Rencana FIFO ditandai tidak layak. Bandingkan rekomendasi solver, lalu setujui atau tolak.</p></li><li><strong>Simulasi 3D</strong><p>Bandingkan lokasi bottleneck sebelum dan sesudah rekomendasi.</p></li><li><strong>Traceability</strong><p>Dari QC FG out-of-spec, trace mundur ke RT dan farm, lalu trace maju untuk daftar hold.</p></li></ol><Badge>Semua data adalah simulasi</Badge><button className="button secondary wide reset-demo" disabled={resetting} onClick={() => void handleResetDemo()}><Icon icon={RotateCcw} size={16} />{resetting ? "Mengatur ulang demo…" : "Atur ulang demo"}</button>{resetError && <p className="small crit-text" role="alert">{resetError}</p>}<p className="small muted">Menghapus keputusan, hold, konfirmasi, dan perubahan constraint yang tersimpan di browser ini.</p></>}
    </Modal>}
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
