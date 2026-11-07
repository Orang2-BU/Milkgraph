"use client";

import { ArrowRight } from "lucide-react";
import { Card, Icon, SectionTitle } from "@/components/ui";
import type { Output } from "@/mock/outputs";

export type Filters = { product: string; date: string; time: string; code: string };
export const EMPTY: Filters = { product: "", date: "", time: "", code: "" };

/** Output yang cocok dengan filter: produk, tanggal, jam selesai (jam yang sama), dan kode lot. */
export function matchOutputs(outputs: Output[], f: Filters) {
  const code = f.code.trim().toUpperCase();
  return outputs.filter(o =>
    (!f.product || o.product === f.product) &&
    (!f.date || o.date === f.date) &&
    (!f.time || (o.end !== null && o.end.slice(0, 2) === f.time.slice(0, 2))) &&
    (!code || o.id.includes(code)));
}

/** Kartu "Pilih output produksi": pilih lot langsung, atau persempit lewat produk, tanggal, jam selesai, dan kode. */
export function OutputPicker({ outputs, filters, setFilters, selected, onSelect, onExample }: {
  outputs: Output[]; filters: Filters; setFilters: (f: Filters) => void; selected: string; onSelect: (id: string) => void; onExample: () => void;
}) {
  const all = outputs;
  const list = matchOutputs(all, filters);
  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters({ ...filters, [k]: e.target.value });
  return <Card className="rp-picker">
    <SectionTitle title="Pilih output produksi" subtitle="Tentukan hasil produksi untuk melihat seluruh riwayatnya." action={<button type="button" className="inline-link" onClick={() => setFilters(EMPTY)}>Reset pilihan</button>} />
    <label className="rp-field rp-main"><span>Output yang dilacak</span>
      <select value={list.some(o => o.id === selected) ? selected : ""} onChange={e => onSelect(e.target.value)} disabled={!list.length}>
        {!list.length && <option value="">Tidak ada output yang cocok</option>}
        {list.map(o => <option key={o.id} value={o.id}>{o.id} · {o.product}</option>)}
      </select>
    </label>
    <div className="rp-filters">
      <label className="rp-field"><span>Produk</span><select value={filters.product} onChange={set("product")}><option value="">Semua produk</option>{[...new Set(all.map(o => o.product))].map(p => <option key={p}>{p}</option>)}</select></label>
      <label className="rp-field"><span>Tanggal produksi</span><input type="date" value={filters.date} onChange={set("date")} /></label>
      <label className="rp-field"><span>Selesai pukul</span><input type="time" value={filters.time} onChange={set("time")} /></label>
      <label className="rp-field"><span>Kode lot / produk</span><input type="search" value={filters.code} onChange={set("code")} placeholder="Cari kode..." autoComplete="off" /></label>
    </div>
    <div className="rp-picker-foot">
      <span className="small muted" role="status">{list.length} output tersedia</span>
      <button type="button" className="text-link" onClick={onExample}>Contoh stroberi · 16.00<Icon icon={ArrowRight} size={14} /></button>
    </div>
  </Card>;
}
