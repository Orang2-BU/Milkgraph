import type { ReactNode } from "react";

/** Nama alat dan proses per tipe node graph, dalam bahasa UI. */
export const KIND_LABEL: Record<string, string> = {
  Farm: "Farm", RT: "Road tanker", LabResult: "Hasil lab", Buffer: "Tangki raw milk", Bay: "Bay bongkar", CIPEvent: "CIP",
  Thermal: "Thermizer", Separator: "Separator", Storage: "Transfer tank", Cream: "Tangki krim", Premix: "Premix", Mixing: "Mixing",
  Sterilisasi: "Sterilisasi UHT", Aseptic: "Aseptic tank", Filling: "Mesin filling", Lot: "Lot barang jadi",
};

/*
 * Ilustrasi skematik alat, bukan gambar alat sebenarnya. Warna diatur dari CSS lewat --eq-ink, --eq-body, dan --eq-accent
 * (lihat .equipment di globals.css). Kelas: tanpa kelas = badan berisi, "l" = garis saja, "a" = isi aksen, "as" = garis aksen.
 */
const shapes: Record<string, ReactNode> = {
  Farm: <><path d="M6 53H58" className="l" /><path d="M12 30L32 15L52 30V53H12Z" /><rect className="a" x="26" y="37" width="12" height="16" rx="1" /><path className="l" d="M26 37L38 53M38 37L26 53" /><rect x="17" y="34" width="5" height="5" /><rect x="42" y="34" width="5" height="5" /></>,
  RT: <><rect x="6" y="19" width="36" height="21" rx="10.5" /><rect className="a" x="11" y="26" width="26" height="7" rx="3.5" /><path d="M44 26H52L58 33V44H44Z" /><path className="a" d="M47 29H51L55 34H47Z" /><path className="l" d="M4 44H60" /><circle cx="14" cy="47" r="5" /><circle cx="33" cy="47" r="5" /><circle cx="51" cy="47" r="5" /></>,
  Buffer: <><path d="M18 15Q32 6 46 15V47H18Z" /><path className="a" d="M18 31H46V47H18Z" /><path className="l" d="M18 15Q32 6 46 15V47H18Z" /><circle cx="32" cy="22" r="3" /><path className="l" d="M22 47V56M42 47V56M14 56H50" /></>,
  Bay: <><path d="M8 22L32 12L56 22V27H8Z" /><path className="l" d="M12 27V54M52 27V54M6 54H58" /><path className="as" d="M32 27C32 36 40 36 40 44" /><rect className="a" x="20" y="48" width="24" height="6" rx="1" /></>,
  CIPEvent: <><path className="l" d="M8 18H40V26" /><path d="M34 26H46L44 32H36Z" /><circle className="a" cx="31" cy="41" r="2.5" /><circle className="a" cx="40" cy="44" r="2.5" /><circle className="a" cx="49" cy="41" r="2.5" /><circle className="a" cx="35" cy="51" r="2.5" /><circle className="a" cx="45" cy="52" r="2.5" /></>,
  Thermal: <><path className="as" d="M24 11C22 9 26 7 24 5M32 11C30 9 34 7 32 5M40 11C38 9 42 7 40 5" /><rect x="12" y="14" width="40" height="34" rx="3" /><path className="l" d="M20 18V44M26 18V44M32 18V44M38 18V44M44 18V44" /><path className="as" d="M4 24H12M52 38H60" /><path className="l" d="M16 48V55M48 48V55" /></>,
  Separator: <><path className="as" d="M46 19H57M18 19H7" /><path d="M18 14H46L42 34Q32 42 22 34Z" /><path className="l" d="M22 20H42M24 27H40" /><path className="l" d="M32 39V46" /><rect className="a" x="20" y="46" width="24" height="10" rx="2" /></>,
  Storage: <><rect x="28" y="15" width="8" height="5" /><rect x="8" y="20" width="48" height="22" rx="11" /><rect className="a" x="12" y="31" width="40" height="8" rx="4" /><path className="l" d="M16 42L14 52M48 42L50 52M8 52H56" /></>,
  Cream: <><rect x="12" y="18" width="26" height="32" rx="6" /><rect className="a" x="15" y="33" width="20" height="14" rx="3" /><path className="l" d="M17 50V56M33 50V56" /><path className="a" d="M49 13C49 13 43 21 43 26A6 6 0 0 0 55 26C55 21 49 13 49 13Z" /></>,
  Premix: <><path d="M14 12H50L38 36V44H26V36Z" /><path className="a" d="M20 18H44L38 30H26Z" /><rect x="28" y="44" width="8" height="4" /><path className="l" d="M32 48V57" /></>,
  Mixing: <><rect x="27" y="5" width="10" height="9" rx="2" /><path d="M14 16H50V44Q32 54 14 44Z" /><path className="a" d="M14 31H50V44Q32 54 14 44Z" /><path className="l" d="M14 16H50V44Q32 54 14 44Z" /><path className="l" d="M32 14V43M24 41L32 38L40 41" /></>,
  Sterilisasi: <><rect x="10" y="12" width="44" height="40" rx="4" /><path className="as" d="M18 21H46A4 4 0 0 1 46 29H18A4 4 0 0 0 18 37H46" /><rect className="l" x="17" y="42" width="12" height="5" rx="1" /><circle className="a" cx="40" cy="44.5" r="2.5" /><circle className="a" cx="47" cy="44.5" r="2.5" /><path className="l" d="M15 52V57M49 52V57" /></>,
  Aseptic: <><path d="M20 13Q32 4 44 13V48H20Z" /><path className="a" d="M20 27H44V48H20Z" /><path className="l" d="M20 13Q32 4 44 13V48H20Z" /><path d="M32 30L38 32V37C38 41 35 43 32 44C29 43 26 41 26 37V32Z" /><path className="l" d="M23 48V56M41 48V56M16 56H48" /></>,
  Filling: <><rect x="8" y="6" width="26" height="24" rx="3" /><rect className="a" x="12" y="10" width="18" height="9" rx="2" /><path className="l" d="M21 30V34" /><rect x="4" y="48" width="56" height="6" rx="3" /><rect className="a" x="17" y="36" width="8" height="12" /><path d="M38 48V36L42 32L46 36V48Z" /><path d="M49 48V36L53 32L57 36V48Z" /></>,
  Lot: <><rect x="12" y="16" width="19" height="14" rx="1" /><rect x="33" y="16" width="19" height="14" rx="1" /><rect x="12" y="32" width="19" height="14" rx="1" /><rect x="33" y="32" width="19" height="14" rx="1" /><path className="as" d="M17 21H26M38 21H47M17 37H26M38 37H47" /><rect x="8" y="46" width="48" height="4" /><path className="l" d="M12 50V55M32 50V55M52 50V55" /></>,
  LabResult: <><path d="M28 8V24L14 50Q12 55 18 55H46Q52 55 50 50L36 24V8Z" /><path className="a" d="M19.5 42H44.5L50 50Q52 55 46 55H18Q12 55 14 50Z" /><path className="l" d="M24 8H40" /><circle className="l" cx="30" cy="34" r="1.5" /><circle className="l" cx="35" cy="38" r="1" /></>,
};

export function Equipment({ kind, size = 56 }: { kind: string; size?: number }) {
  return <svg className="equipment" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">{shapes[kind] ?? shapes.Storage}</svg>;
}
