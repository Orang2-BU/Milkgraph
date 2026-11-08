import type { Handoff } from "./types";
import raw from "./scenario.json";

/**
 * Output produksi yang bisa dilacak di Riwayat Produksi (data simulasi).
 * Lot cokelat FG-1013-05 s.d. 09 berbagi satu rantai serah-terima dari scenario.json (batch MXB-1013-07); jam selesai per lot
 * belum tercatat di MES, hanya rentang filling bersama. Jalur stroberi FG-1012-11 ditambahkan sebagai contoh dari revisi
 * 7 Nov 2026 ("lacak susu stroberi jam 4"); sumber buktinya memakai catatan generik yang sudah ada, sisanya kosong.
 */
export interface Output {
  id: string;
  product: string;
  line: string;
  date: string;
  /** Jam selesai lot, null bila belum tercatat per lot. */
  end: string | null;
  packs: number;
  farm: string;
  chain: Handoff[];
  qc: { status: "out-of-spec" | "lulus"; lab: string; note: string } | null;
}

const cocoa = (raw as { handoffs: Handoff[] }).handoffs;
const cocoaLots = [["FG-1013-05", 7200], ["FG-1013-06", 7400], ["FG-1013-07", 7300], ["FG-1013-08", 7100], ["FG-1013-09", 7100]] as const;

const strawberry: Handoff[] = [
  { step: "Farm ke RT", from: "Farm Sumberejo", to: "RT-11", batch: "SJ-SBJ-1012-11", kind: "Surat jalan", window: "12 Okt 03.50 - 05.10", volume: "9.600 L", record: "Surat jalan + tiket weighbridge", source: "", gap: false },
  { step: "Receiving", from: "RT-11", to: "RMT-1", batch: "RMB-1012-01", kind: "Raw milk batch", window: "12 Okt 05.40 - 06.05", volume: "9.600 L dari 41.000 L", record: "Flowmeter bay + level RMT-1", source: "RMT-LEVEL", gap: false },
  { step: "Pre-processing", from: "RMT-1", to: "TH-1, SP-1", batch: "RMB-1012-01", kind: "Raw milk batch", window: "12 Okt 06.30 - 08.40", volume: "40.100 L", record: "Historian SCADA", source: "TR-PROC", gap: false },
  { step: "Storage / transfer tank", from: "SP-1", to: "ST-3", batch: "STB-1012-03", kind: "Batch storage", window: "12 Okt 08.40 - 09.20", volume: "39.000 L", record: "Irisan waktu flowmeter SP-1 dan kenaikan level ST-3", source: "", gap: true },
  { step: "Mixing", from: "ST-3 + premix stroberi", to: "MX-1", batch: "MXB-1012-02", kind: "Batch produk", window: "12 Okt 09.30 - 10.20", volume: "41.500 L", record: "Batch record MES", source: "", gap: false },
  { step: "Sterilisasi dan aseptic", from: "MX-1", to: "UHT-2, AT-2", batch: "MXB-1012-02", kind: "Batch produk", window: "12 Okt 10.20 - 15.10", volume: "41.000 L", record: "Historian SCADA", source: "TR-PROC", gap: false },
  { step: "Filling", from: "AT-2", to: "F2", batch: "FG-1012-11", kind: "Lot barang jadi", window: "12 Okt 11.05 - 16.00", volume: "1 lot, 7.400 pak", record: "MES filling", source: "FILL-F2", gap: false },
];

export const OUTPUTS: Output[] = [
  { id: "FG-1012-11", product: "UHT Stroberi 200 ml", line: "F2", date: "2026-10-12", end: "16.00", packs: 7400, farm: "Farm Sumberejo", chain: strawberry, qc: { status: "lulus", lab: "", note: "QC barang jadi lulus (LAB-8806, 12 Okt 16.20). Inkubasi 7 hari masih berjalan." } },
  ...cocoaLots.map(([id, packs]) => ({
    id, product: "UHT Cokelat 200 ml", line: "F2", date: "2026-10-13", end: null, packs, farm: "Farm Ngadirejo", chain: cocoa,
    qc: id === "FG-1013-07" ? { status: "out-of-spec" as const, lab: "LAB-8812", note: "Residu antibiotik beta-laktam positif, di atas batas (13 Okt 22.40)." } : null,
  })),
];
