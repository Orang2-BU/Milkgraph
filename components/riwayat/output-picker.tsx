"use client";

import { ArrowRight } from "lucide-react";
import { Card, Icon, SectionTitle } from "@/components/ui";
import { DateField, Select, TimeField } from "@/components/ui/fields";
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
  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, [k]: e.target.value });
  const put = (k: keyof Filters) => (value: string) => setFilters({ ...filters, [k]: value });
  return <Card className="rp-picker">
    <SectionTitle title="Pilih output produksi" subtitle="Tentukan hasil produksi untuk melihat seluruh riwayatnya." action={<button type="button" className="inline-link" onClick={() => setFilters(EMPTY)}>Reset pilihan</button>} />
    <label className="rp-field rp-main"><span>Output yang dilacak</span>
      <Select label="Output yang dilacak" value={list.some(o => o.id === selected) ? selected : ""} onChange={onSelect} disabled={!list.length} placeholder="Tidak ada output yang cocok" options={list.map(o => ({ value: o.id, label: `${o.id} · ${o.product}` }))} />
    </label>
    <div className="rp-filters">
      <label className="rp-field"><span>Produk</span><Select label="Produk" value={filters.product} onChange={put("product")} options={[{ value: "", label: "Semua produk" }, ...[...new Set(all.map(o => o.product))].map(p => ({ value: p, label: p }))]} /></label>
      <label className="rp-field"><span>Tanggal produksi</span><DateField label="Tanggal produksi" value={filters.date} onChange={put("date")} initialMonth={all[0]?.date} /></label>
      <label className="rp-field"><span>Selesai pukul</span><TimeField label="Selesai pukul" value={filters.time} onChange={put("time")} /></label>
      <label className="rp-field"><span>Kode lot / produk</span><input type="search" value={filters.code} onChange={set("code")} placeholder="Cari kode..." autoComplete="off" /></label>
    </div>
    <div className="rp-picker-foot">
      <span className="small muted" role="status">{list.length} output tersedia</span>
      <button type="button" className="text-link" onClick={onExample}>Contoh stroberi · 16.00<Icon icon={ArrowRight} size={14} /></button>
    </div>
  </Card>;
}
