import type { Handoff } from "../../mock/types";

/** Logika murni jalur produksi (tanpa React), dites lewat tests/riwayat-timeline.test.mjs. */

const minutes = (hhmm: string) => { const [h, m] = hhmm.split(".").map(Number); return h * 60 + m; };

/** "13 Okt 04.30 - 05.40" menjadi hari, jam mulai/selesai, dan menitnya. */
export function parseWindow(window: string) {
  const m = window.match(/^(.*?)\s*(\d{2}\.\d{2})\s*-\s*(\d{2}\.\d{2})$/);
  if (!m) return null;
  return { day: m[1], startText: m[2], endText: m[3], start: minutes(m[2]), end: minutes(m[3]) };
}

export function durationText(total: number) {
  const h = Math.floor(total / 60), m = total % 60;
  return h && m ? `${h} jam ${m} menit` : h ? `${h} jam` : `${m} menit`;
}

/** Tiap tahap beserta durasinya, jeda dari tahap sebelumnya, atau tanda berjalan bersamaan bila rentangnya tumpang tindih. */
export function buildSteps(chain: Handoff[]) {
  let prevEnd: number | null = null;
  return chain.map((h, i) => {
    const w = parseWindow(h.window);
    const gap = w && prevEnd !== null ? w.start - prevEnd : 0;
    const step = { ...h, index: i, window: w, duration: w ? w.end - w.start : 0, gapBefore: gap > 0 ? gap : 0, overlapsPrev: gap < 0 };
    if (w) prevEnd = w.end;
    return step;
  });
}
