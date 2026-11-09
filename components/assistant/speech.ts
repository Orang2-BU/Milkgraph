/**
 * Pengenal suara menulis kode alat sebagai kata ("uht dua", "ef sepuluh"). Di sini diubah ke kode yang dikenali data.
 * Hanya kata yang didahului nama alat yang diubah, jadi kalimat biasa tetap utuh. Logika murni, dites lewat tests/assistant-speech.test.mjs.
 */
const NUM: Record<string, string> = { nol: "0", satu: "1", dua: "2", tiga: "3", empat: "4", lima: "5", enam: "6", tujuh: "7", delapan: "8", sembilan: "9", sepuluh: "10" };
const DIGIT = `(?:\\d+|${Object.keys(NUM).join("|")})`;
const NUMBER = `(${DIGIT}(?:\\s${DIGIT})?)`;
const toDigits = (s: string) => s.split(/\s+/).map(w => NUM[w.toLowerCase()] ?? w).join("");

const CODES: [string, (n: string) => string][] = [
  ["uht|u\\s?ha\\s?te", n => `UHT-${n}`],
  ["rmt|er\\s?em\\s?te", n => `RMT-${n}`],
  ["at|a\\s?te", n => `AT-${n}`],
  ["st|es\\s?te", n => `ST-${n}`],
  ["ct|ce\\s?te", n => `CT-${n}`],
  ["mx|em\\s?eks", n => `MX-${n}`],
  ["rt|er\\s?te", n => `RT-${n}`],
  ["bay|bei", n => `Bay ${n}`],
  ["f|ef", n => `F${n}`],
];

export function normalizeSpeech(text: string) {
  return CODES.reduce((t, [name, code]) => t.replace(new RegExp(`\\b(?:${name})[\\s-]?${NUMBER}\\b`, "gi"), (_, n: string) => code(toDigits(n))), text);
}
