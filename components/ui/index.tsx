"use client";

import { useEffect, useRef, type ReactNode, type ComponentProps } from "react";
import { ArrowUpRight, X, Database, Lock, type LucideIcon } from "lucide-react";
import { scenario } from "@/lib/data";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";
import type { Source } from "@/mock/types";
import type { Block, Tone } from "@/mock/types";
import { time } from "@/lib/format";
import { useDemo } from "@/lib/demo";
import { can, whoCan, type Permission } from "@/lib/roles";

export function Icon({ icon: Glyph, size = 18, ...props }: { icon: LucideIcon; size?: number } & ComponentProps<"svg">) {
  return <Glyph size={size} strokeWidth={1.75} aria-hidden="true" {...props} />;
}
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge ${tone}`}><span className="status-dot" />{children}</span>;
}
export function Card({ children, className = "", ...props }: ComponentProps<"section">) {
  return <section className={`card ${className}`} {...props}>{children}</section>;
}
export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
export function Modal({ title, onClose, children, className = "" }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; active?.focus(); };
  }, []);
  return <dialog ref={dialog} className={`modal ${className}`} aria-label={title} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-body"><div className="section-heading"><h2>{title}</h2><button className="icon-button" aria-label="Tutup dialog" onClick={onClose}><Icon icon={X} /></button></div>{children}</div>
  </dialog>;
}
export function SourceButton({ id, onSelect, onHighlight, compact = false }: { id: string; onSelect: (id: string) => void; onHighlight?: (id: string | null) => void; compact?: boolean }) {
  const sources = useResource<Source[]>(API_MODE ? "/sources" : null);
  const source = API_MODE ? sources.data?.find(s => s.id === id) : scenario.sources.find(s => s.id === id);
  return <button className={`source-chip ${compact ? "compact" : ""}`} onClick={() => onSelect(id)} onMouseEnter={() => onHighlight?.(source?.node ?? null)} onMouseLeave={() => onHighlight?.(null)} onFocus={() => onHighlight?.(source?.node ?? null)} onBlur={() => onHighlight?.(null)} aria-label={`Lihat sumber ${id}`}><Icon icon={Database} size={13} /><span>{id}{!compact && source && ` · ${source.time}`}</span><Icon icon={ArrowUpRight} size={13} /></button>;
}
export function SourceModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const resource = useResource<Source>(API_MODE && id ? `/sources/${encodeURIComponent(id)}` : null);
  if (!id) return null;
  const source = API_MODE ? resource.data : scenario.sources.find(s => s.id === id);
  if (API_MODE && resource.loading && !source) {
    return <Modal title="Bukti operasional" onClose={onClose}><p className="muted" role="status">Memuat bukti operasional…</p></Modal>;
  }
  if (API_MODE && resource.error) {
    return <Modal title="Bukti operasional" onClose={onClose}><p className="crit-text" role="alert">Gagal memuat bukti: {resource.error.message}</p><button className="button secondary wide" onClick={onClose}>Tutup</button></Modal>;
  }
  if (!source) {
    return <Modal title="Bukti operasional" onClose={onClose}><p className="muted">Bukti {id} tidak ditemukan.</p><button className="button secondary wide" onClick={onClose}>Tutup</button></Modal>;
  }
  return <Modal title="Bukti operasional" onClose={onClose}><Badge>Data simulasi</Badge><h3 className="source-title">{source.title}</h3><p className="mono muted">{source.id} · {source.time}</p><p className="source-detail">{source.detail}</p><p className="small muted">Sumber: snapshot skenario pabrik, 14 Oktober 2026. Catatan ini merupakan data demo.</p><button className="button secondary wide" onClick={onClose}>Selesai membaca</button></Modal>;
}
export function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string }) {
  return <div className="toggle" role="group" aria-label={label}>{options.map(option => <button key={option.value} aria-pressed={value === option.value} className={value === option.value ? "selected" : ""} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}
export function PageHeading({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{children && <div className="page-actions">{children}</div>}</div>;
}
/** Keterangan saat peran aktif tidak boleh melakukan aksi di halaman ini. */
export function RoleNote({ permission }: { permission: Permission }) {
  const { role } = useDemo();
  if (can(role, permission)) return null;
  return <p className="role-note"><Icon icon={Lock} size={14} /><span>{whoCan(permission)} Ganti peran lewat kartu akun di sidebar.</span></p>;
}
/** Gantt 13.00 - 20.00 dengan garis "sekarang"; blok bisa diklik untuk membuka sumbernya. */
export function Timeline({ blocks, resources, onSource }: { blocks: Block[]; resources: string[]; onSource: (id: string) => void }) {
  const meta = useResource<{ now: string }>(API_MODE ? "/meta" : null);
  const now = API_MODE && meta.data ? meta.data.now : scenario.now;
  return <div className="gantt-scroll" tabIndex={0} role="region" aria-label="Timeline rencana, gulir horizontal untuk melihat semua jam"><div className="gantt"><div className="gantt-header"><span>Sumber daya</span><div className="gantt-hours">{Array.from({ length: 8 }, (_, i) => <span key={i}>{13 + i}.00</span>)}</div></div><div className="gantt-rows">{resources.map(resource => <div className="gantt-row" key={resource}><span className="resource-name">{resource}</span><div className="gantt-track">{blocks.filter(b => b.resource === resource).map((block, i) => <button key={`${block.label}-${i}`} className={`gantt-block ${block.type}`} style={{ left: `${block.start / 420 * 100}%`, width: `${(block.end - block.start) / 420 * 100}%` }} onClick={() => onSource(block.source)} title={`${resource}: ${block.label}, ${time(block.start)} - ${time(block.end)}`} aria-label={`${resource}, ${block.label}, ${time(block.start)} sampai ${time(block.end)}, ${block.end - block.start} menit. Lihat sumber.`}>{block.label}</button>)}</div></div>)}<div className="now-line"><span>Sekarang {now}</span></div></div></div></div>;
}
