"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { navigation, findNav } from "@/lib/nav";
import { Icon } from "@/components/ui";

/* Geometri cabang, diadaptasi dari BranchedMenu (React Bits).
   TRUNK sejajar tengah ikon menu utama, INDENT sejajar teks label menu utama. */
const ROW = 44;
const PAD = 4;
const TRUNK = 28;
const INDENT = 54;
const R = 10;
const END = INDENT - 10;
const rowY = (k: number) => PAD + k * ROW + ROW / 2;
const branch = (k: number) => `M ${TRUNK} ${rowY(k) - R} A ${R} ${R} 0 0 0 ${TRUNK + R} ${rowY(k)} H ${END}`;
const reach = (k: number) => `M ${TRUNK} 0 V ${rowY(k) - R} A ${R} ${R} 0 0 0 ${TRUNK + R} ${rowY(k)} H ${END}`;
const length = (k: number) => rowY(k) - R + (Math.PI * R) / 2 + (END - TRUNK - R);

/** Menu utama dengan sub-halaman bercabang. Bagian yang memuat halaman aktif terbuka otomatis. */
export function BranchedNav({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const current = findNav(pathname);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  return <nav aria-label="Navigasi utama" className="nav-list">
    {navigation.map(item => {
      const inSection = item === current.item;
      const kids = item.tabs.length > 1 ? item.tabs : null;
      const open = kids ? (toggled[item.label] ?? inSection) : false;
      const id = `nav-sub-${item.label.toLowerCase().replace(/\W+/g, "-")}`;
      const height = kids ? PAD * 2 + kids.length * ROW : 0;
      return <div key={item.label} className="nav-section" data-open={open ? "" : undefined}>
        <div className="nav-row">
          <Link href={item.tabs[0].href} className={`nav-item ${inSection ? "active" : ""}`} title={`${item.label}: ${item.hint}`} aria-label={item.label} aria-current={inSection && !kids ? "page" : undefined} onClick={e => {
            // Sudah di dalam bagian ini: klik menu induk membuka/menutup sub-menu, tidak pindah ke sub-halaman pertama.
            if (kids && inSection) { e.preventDefault(); setToggled(t => ({ ...t, [item.label]: !open })); return; }
            if (kids) setToggled(t => ({ ...t, [item.label]: true }));
            onNavigate();
          }}>
            <span className="nav-icon"><Icon icon={item.icon} size={22} /></span>
            <span className="nav-label nav-text"><span>{item.label}</span><small>{item.hint}</small></span>
          </Link>
          {kids && <button type="button" className="nav-fold nav-label" aria-label={`${open ? "Tutup" : "Buka"} sub-menu ${item.label}`} aria-expanded={open} aria-controls={id} onClick={() => setToggled(t => ({ ...t, [item.label]: !open }))}><Icon icon={ChevronDown} size={16} /></button>}
        </div>
        {kids && <div className="nav-branch nav-label" id={id} inert={!open}>
          <div className="nav-branch-fold">
            <div className="nav-branch-tree" style={{ height }}>
              <svg className="nav-branch-lines" width={INDENT} height={height} aria-hidden="true">
                <path className="nav-branch-base" d={`M ${TRUNK} 0 V ${rowY(kids.length - 1) - R}`} />
                {kids.map((tab, k) => <path key={tab.href} className="nav-branch-base" d={branch(k)} />)}
                {kids.map((tab, k) => <path key={tab.href} className="nav-branch-reach" d={reach(k)} style={{ strokeDasharray: length(k), strokeDashoffset: tab === current.tab ? 0 : length(k) }} />)}
              </svg>
              {kids.map(tab => {
                const active = tab === current.tab;
                return <Link key={tab.href} href={tab.href} className="nav-sub" aria-current={active ? "page" : undefined} onClick={onNavigate}>{tab.icon && <Icon icon={tab.icon} size={16} />}<span>{tab.label}</span></Link>;
              })}
            </div>
          </div>
        </div>}
        {/* Sidebar ciut (konsep Pantara): sub-halaman bagian yang terbuka tampil sebagai ikon kecil di bawah induknya. */}
        {kids && <div className="nav-rail" role="group" aria-label={`Sub-menu ${item.label}`}>
          {kids.map(tab => <Link key={tab.href} href={tab.href} className="nav-rail-link" title={tab.label} aria-label={tab.label} aria-current={tab === current.tab ? "page" : undefined} onClick={onNavigate}>{tab.icon && <Icon icon={tab.icon} size={17} />}</Link>)}
        </div>}
      </div>;
    })}
  </nav>;
}
