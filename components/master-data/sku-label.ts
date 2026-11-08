/**
 * Label SKU barang jadi untuk tabel dan pilihan changeover di Master Alat. Data dari API bisa tanpa `sku_name`;
 * namanya lalu dibentuk dari kode (mis. UHT-FC-1000-LOCAL jadi "UHT Full Cream 1000 ml, lokal") supaya tidak tampil "()".
 * Logika murni, dites lewat tests/master-sku-label.test.mjs.
 */
type Sku = { finished_sku_id: string; sku_name?: string };

const FLAVOR: Record<string, string> = { FC: "Full Cream", CH: "Cokelat", ST: "Stroberi", SK: "Skim", WC: "Whipping Cream", LF: "Low Fat" };
const MARKET: Record<string, string> = { LOCAL: "lokal", EXP: "ekspor" };

export function skuName(s: Sku) {
  if (s.sku_name?.trim()) return s.sku_name.trim();
  const [line, flavor, size, market] = s.finished_sku_id.split("-");
  if (!flavor || !FLAVOR[flavor]) return "";
  return `${line} ${FLAVOR[flavor]}${size ? ` ${size} ml` : ""}${market && MARKET[market] ? `, ${MARKET[market]}` : ""}`;
}

export function skuOption(s: Sku) {
  const name = skuName(s);
  return name ? `${s.finished_sku_id} · ${name}` : s.finished_sku_id;
}
