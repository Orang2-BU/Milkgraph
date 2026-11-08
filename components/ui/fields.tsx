"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Search } from "lucide-react";
import { Icon } from "./index";

/**
 * Kontrol form global (revisi 8 Nov poin 5): pengganti <select>, <input type="date">, dan <input type="time">
 * bawaan browser supaya tampilan dan popup-nya sama di semua OS. Popup dirender lewat portal agar tidak terpotong card.
 */

type Placement = { top: number; left: number; width: number; maxHeight: number; up: boolean; host: HTMLElement };

function usePopover(open: boolean, close: () => void, minWidth = 220) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Placement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = trigger.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - 12, above = r.top - 12;
      const up = below < 240 && above > below;
      const width = Math.max(r.width, minWidth);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      // Di dalam <dialog> modal, popup harus ikut top layer dialog itu.
      const host = el.closest("dialog") ?? document.body;
      setPlace({ top: up ? r.top - 6 : r.bottom + 6, left, width, maxHeight: Math.min(340, Math.max(160, (up ? above : below) - 8)), up, host });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, minWidth]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, close]);

  return { trigger, panel, place: open ? place : null };
}

function Popover({ place, panelRef, children, className = "", label }: { place: Placement | null; panelRef: React.RefObject<HTMLDivElement | null>; children: ReactNode; className?: string; label: string }) {
  if (!place) return null;
  return createPortal(
    <div ref={panelRef} className={`field-popover ${place.up ? "up" : ""} ${className}`} aria-label={label}
      style={{ left: place.left, width: place.width, maxHeight: place.maxHeight, ...(place.up ? { bottom: window.innerHeight - place.top } : { top: place.top }) }}>
      {children}
    </div>, place.host);
}

export type SelectOption<T extends string | number> = { value: T; label: string; group?: string; hint?: string };

/** Dropdown bergaya MilkGraph. Daftar panjang (lebih dari 10 opsi) otomatis punya kolom cari. */
export function Select<T extends string | number>({ value, onChange, options, placeholder = "Pilih...", label, id, disabled = false, className = "", searchable, compact = false }: {
  value: T | null | ""; onChange: (value: T) => void; options: SelectOption<T>[]; placeholder?: string; label?: string; id?: string; disabled?: boolean; className?: string; searchable?: boolean; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const close = useCallback(() => { setOpen(false); setQuery(""); }, []);
  const { trigger, panel, place } = usePopover(open, close);
  const listId = useId();
  const search = searchable ?? options.length > 10;
  const selected = options.find(o => o.value === value);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => `${o.label} ${o.group ?? ""} ${o.hint ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);
  // Judul grup tampil di opsi pertama tiap grup.
  const headed = shown.map((o, i) => ({ o, i, header: o.group && o.group !== shown[i - 1]?.group ? o.group : null }));

  const openList = () => {
    setActive(Math.max(0, options.findIndex(o => o.value === value)));
    setOpen(true);
  };
  const pick = (o: SelectOption<T>) => { onChange(o.value); close(); trigger.current?.focus(); };
  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); close(); trigger.current?.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(shown.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[active]) pick(shown[active]); }
    else if (e.key === "Tab") close();
  };
  useEffect(() => {
    if (open && place) panel.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, place, panel]);

  return <>
    <button ref={trigger} id={id} type="button" className={`field-control field-select ${compact ? "compact" : ""} ${className}`} disabled={disabled}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-label={label}
      onClick={() => open ? close() : openList()} onKeyDown={onKey}>
      <span className={selected ? "field-value" : "field-value placeholder"}>{selected ? selected.label : placeholder}</span>
      <Icon icon={ChevronDown} size={16} className="field-caret" />
    </button>
    <Popover place={place} panelRef={panel} label={label ?? placeholder}>
      {search && <div className="field-search"><Icon icon={Search} size={15} /><input autoFocus value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey} placeholder="Cari..." aria-label="Cari opsi" aria-controls={listId} /></div>}
      <ul id={listId} role="listbox" className="field-options" aria-label={label ?? placeholder}>
        {headed.map(({ o, i, header }) => <OptionRow key={String(o.value)} header={header}>
          <li role="option" data-index={i} aria-selected={o.value === value} className={i === active ? "active" : ""}
            onPointerMove={() => setActive(i)} onClick={() => pick(o)}>
            <span>{o.label}{o.hint && <small>{o.hint}</small>}</span>
            {o.value === value && <Icon icon={Check} size={15} />}
          </li>
        </OptionRow>)}
        {!shown.length && <li className="field-empty" role="presentation">Tidak ada yang cocok</li>}
      </ul>
    </Popover>
  </>;
}
function OptionRow({ header, children }: { header: string | null; children: ReactNode }) {
  return <>{header && <li role="presentation" className="field-group">{header}</li>}{children}</>;
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthOf = (v: string) => ({ y: Number(v.slice(0, 4)), m: Number(v.slice(5, 7)) - 1 });
export function formatDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}` : "";
}

/** Pemilih tanggal. Nilai berformat YYYY-MM-DD, sama seperti <input type="date">; string kosong berarti belum dipilih. */
export function DateField({ value, onChange, placeholder = "Pilih tanggal", label, id, initialMonth }: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string; id?: string; initialMonth?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { trigger, panel, place } = usePopover(open, close, 280);
  const base = () => value || initialMonth || iso(new Date().getFullYear(), new Date().getMonth(), 1);
  const [view, setView] = useState(() => monthOf(base()));
  const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (n: number) => setView(v => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const pick = (v: string) => { onChange(v); close(); trigger.current?.focus(); };
  const toggle = () => { if (!open) setView(monthOf(base())); setOpen(!open); };

  return <>
    <button ref={trigger} id={id} type="button" className="field-control field-select" aria-haspopup="dialog" aria-expanded={open} aria-label={label}
      onClick={toggle} onKeyDown={e => { if (e.key === "Escape") close(); }}>
      <Icon icon={CalendarDays} size={16} className="field-lead" />
      <span className={value ? "field-value" : "field-value placeholder"}>{value ? formatDate(value) : placeholder}</span>
      <Icon icon={ChevronDown} size={16} className="field-caret" />
    </button>
    <Popover place={place} panelRef={panel} label={label ?? placeholder} className="field-calendar">
      <div role="dialog" aria-label={label ?? placeholder} onKeyDown={e => { if (e.key === "Escape") pick(value); }}>
        <div className="cal-head">
          <button type="button" className="icon-button" aria-label="Bulan sebelumnya" onClick={() => shift(-1)}><Icon icon={ChevronLeft} size={16} /></button>
          <strong aria-live="polite">{MONTHS[view.m]} {view.y}</strong>
          <button type="button" className="icon-button" aria-label="Bulan berikutnya" onClick={() => shift(1)}><Icon icon={ChevronRight} size={16} /></button>
        </div>
        <div className="cal-grid" role="grid">
          {DAYS.map(d => <span key={d} className="cal-dow" role="columnheader">{d}</span>)}
          {cells.map((d, i) => {
            if (d === null) return <span key={`e${i}`} />;
            const v = iso(view.y, view.m, d);
            return <button key={v} type="button" role="gridcell" aria-selected={v === value} className={v === value ? "selected" : ""} onClick={() => pick(v)}>{d}</button>;
          })}
        </div>
        <div className="cal-foot"><button type="button" className="text-link" onClick={() => pick("")}>Kosongkan</button><button type="button" className="text-link" onClick={() => pick(value)}>Tutup</button></div>
      </div>
    </Popover>
  </>;
}

/** Pemilih jam. Nilai berformat HH:MM seperti <input type="time">; tampil dengan titik (16.00) sesuai penulisan jam di aplikasi. */
export function TimeField({ value, onChange, placeholder = "Pilih jam", label, id, minuteStep = 15 }: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string; id?: string; minuteStep?: number }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { trigger, panel, place } = usePopover(open, close, 240);
  const [h, m] = value ? value.split(":") : ["", ""];
  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep));
  const done = () => { close(); trigger.current?.focus(); };
  useEffect(() => {
    if (place) panel.current?.querySelectorAll<HTMLElement>("[aria-selected=true]").forEach(el => el.scrollIntoView({ block: "center" }));
  }, [place, panel]);

  return <>
    <button ref={trigger} id={id} type="button" className="field-control field-select" aria-haspopup="dialog" aria-expanded={open} aria-label={label}
      onClick={() => setOpen(o => !o)} onKeyDown={e => { if (e.key === "Escape") close(); }}>
      <Icon icon={Clock3} size={16} className="field-lead" />
      <span className={value ? "field-value" : "field-value placeholder"}>{value ? value.replace(":", ".") : placeholder}</span>
      <Icon icon={ChevronDown} size={16} className="field-caret" />
    </button>
    <Popover place={place} panelRef={panel} label={label ?? placeholder} className="field-time">
      <div role="dialog" aria-label={label ?? placeholder} onKeyDown={e => { if (e.key === "Escape") done(); }}>
        <div className="time-cols">
          <div><span className="cal-dow">Jam</span><ul role="listbox" aria-label="Jam">{hours.map(x => <li key={x} role="option" aria-selected={x === h} className={x === h ? "selected" : ""} tabIndex={0}
            onClick={() => onChange(`${x}:${m || "00"}`)} onKeyDown={e => { if (e.key === "Enter") onChange(`${x}:${m || "00"}`); }}>{x}</li>)}</ul></div>
          <div><span className="cal-dow">Menit</span><ul role="listbox" aria-label="Menit">{minutes.map(x => <li key={x} role="option" aria-selected={x === m} className={x === m ? "selected" : ""} tabIndex={0}
            onClick={() => { onChange(`${h || "00"}:${x}`); done(); }} onKeyDown={e => { if (e.key === "Enter") { onChange(`${h || "00"}:${x}`); done(); } }}>{x}</li>)}</ul></div>
        </div>
        <div className="cal-foot"><button type="button" className="text-link" onClick={() => { onChange(""); done(); }}>Kosongkan</button><button type="button" className="text-link" onClick={done}>Selesai</button></div>
      </div>
    </Popover>
  </>;
}
