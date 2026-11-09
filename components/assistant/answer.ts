import type { Asset } from "../../lib/assets";
import type { Hold, LabDecision, PlanDecision } from "../../lib/demo";
import type { Pick } from "../rencana/recommend";
import type { Tanker } from "../../mock/types";
import { groupAttention } from "../kondisi-alat/groups.ts";
import { findAsset } from "../rencana/plan-answer.ts";
import { classify, type Intent } from "./intent.ts";

/**
 * Jawaban "Tanya MilkGraph". Tanpa LLM: maksud dikenali oleh intent.ts, lalu kalimat dirakit dari data dan kondisi aplikasi saat ditanya
 * (persetujuan, hold, upgrade yang diterapkan, halaman, peran). Fungsi ini bisa diganti panggilan LLM nanti tanpa mengubah panel.
 * Logika murni, dites lewat tests/assistant.test.mjs.
 */
export type Link = { label: string; href: string };
export type Reply = { text: string; links: Link[]; lastAsset?: string };
type Answer = { id: string; title: string; conclusion: string };
type PlanLite = { id: string; label: string; detail: string; reasons: { title: string }[] };
export type Data = { assets: Asset[]; links: [string, string][]; tankers: Tanker[]; answers: Answer[]; plans: PlanLite[]; upgrades: Pick[] };
export type State = {
  page: string; user: string; roleLabel: string; roleFocus: string; planId: string;
  decisions: PlanDecision[]; holds: Hold[]; labs: Record<string, LabDecision>;
  adjustText: string; broken: { before: number; after: number }; lastAsset?: string;
};

const SNAPSHOT = "Per snapshot 14.42";
const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const list = (items: string[]) => items.join(", ");
const unknown: Reply = { text: "Maaf, aku belum bisa menjawab itu, dan aku tidak mau menebak. Aku bisa bantu soal kendala alur susu, jalur dan dampak alat, asal lot, antrean truk, upgrade, dan rencana shift.", links: [] };

const SUGGEST: Record<string, string[]> = {
  "/receiving": ["Truk mana yang paling lama menunggu?", "Kenapa Bay 2 tidak bisa dipakai?", "RT mana yang mendekati batas holding time?", "Ringkas halaman ini"],
  "/lab": ["Antrean tes lab bagaimana?", "RT-04 masuk ke lot apa?", "FG-1013-07 berasal dari mana?", "Ringkas halaman ini"],
  "/alur": ["Ada kendala apa di alur susu?", "Kalau UHT-2 berhenti apa yang kena?", "Susu ke F2 lewat mana?", "AT-2 kenapa?"],
  "/kondisi-alat": ["Ada kendala apa di alur susu?", "F10 kenapa?", "AT-2 kenapa?", "Ringkas halaman ini"],
  "/rencana": ["Rekomendasi solver apa?", "Constraint apa yang dilanggar?", "Alat apa yang perlu diupgrade?", "Ringkas halaman ini"],
  "/riwayat-produksi": ["FG-1013-07 berasal dari mana?", "RT-04 masuk ke lot apa?", "Ada kendala apa di alur susu?", "Ringkas halaman ini"],
};
const DEFAULT_SUGGEST = ["Ada kendala apa di alur susu?", "Kalau UHT-2 berhenti apa yang kena?", "FG-1013-07 berasal dari mana?", "Truk mana yang paling lama menunggu?"];
const section = (page: string) => page.startsWith("/rencana") ? "/rencana" : page === "/trace" ? "/riwayat-produksi" : page;
export const suggestions = (page: string) => SUGGEST[section(page)] ?? DEFAULT_SUGGEST;

function walk(links: [string, string][], from: string, dir: 0 | 1) {
  const seen = new Set<string>(), queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const l of links) if (l[1 - dir] === cur && l[dir] !== from && !seen.has(l[dir])) { seen.add(l[dir]); queue.push(l[dir]); }
  }
  return [...seen];
}

function planLine(d: Data, s: State) {
  const decision = s.decisions.find(x => x.plan === s.planId);
  const adjusted = s.adjustText ? ` Dengan ${s.adjustText} yang diterapkan, rencana awal melanggar ${s.broken.before} dari 6 constraint.` : "";
  if (decision?.status === "approved") return `Rekomendasi sudah disetujui ${decision.by} pukul ${decision.at}.${adjusted}`;
  if (decision) return `Rekomendasi ditolak ${decision.by} pukul ${decision.at}, jadi rencana awal tetap berlaku.${adjusted}`;
  return `${s.adjustText ? `Dengan ${s.adjustText} yang diterapkan, rencana` : "Rencana"} awal melanggar ${s.broken.before} dari 6 constraint, rekomendasi solver ${s.broken.after} dari 6, dan masih menunggu persetujuan planner.`;
}
const approved = (s: State) => s.decisions.find(x => x.plan === s.planId)?.status === "approved";

function kendala(d: Data, s: State): Reply {
  const groups = groupAttention(d.assets), all = groups.flatMap(g => g.items);
  const crit = all.filter(a => a.tone === "crit").map(a => `${a.id} (${a.status})`);
  const trucks = d.tankers.filter(t => t.tone === "crit").map(t => t.id);
  return {
    text: `${SNAPSHOT} ada ${all.length} alat yang perlu diperhatikan.${crit.length ? ` Paling mendesak: ${list(crit)}.` : ""}${trucks.length ? ` ${list(trucks)} mendekati batas holding time.` : ""} ${planLine(d, s)} [simulasi]`,
    links: [{ label: "Buka Kondisi Alat", href: "/kondisi-alat" }, { label: "Buka Kelayakan & keputusan", href: "/rencana" }],
  };
}

function antrean(d: Data, s: State): Reply {
  const waiting = d.tankers.filter(t => t.stage !== "Unloading" && !s.labs[t.id]).sort((a, b) => b.wait - a.wait);
  const top = waiting[0], crit = d.tankers.filter(t => t.tone === "crit");
  const decided = Object.keys(s.labs).length;
  return {
    text: `${SNAPSHOT} ada ${waiting.length} RT yang menunggu.${top ? ` Paling lama ${top.id} (${top.stage}, ${top.wait} menit, ${fmt(top.volume)} L).` : ""}${crit.length ? ` ${crit.map(t => `${t.id} sudah berumur ${t.age}`).join(", ")} dan mendekati batas holding time.` : ""}${decided ? ` ${decided} hasil lab sudah diputuskan di sesi ini.` : ""} [simulasi]`,
    links: [{ label: "Buka Antrean Truk", href: "/receiving" }],
  };
}

function rencana(d: Data, s: State): Reply {
  const plan = d.plans.find(p => p.id === s.planId) ?? d.plans[0];
  return {
    text: `${plan.label}: ${planLine(d, s)} Yang diubah solver: ${list(plan.reasons.map(r => r.title))}. [simulasi]`,
    links: [{ label: "Buka Kelayakan & keputusan", href: "/rencana" }, { label: "Lihat di Alur rencana", href: "/rencana/alur" }],
  };
}

function upgrade(d: Data, s: State): Reply {
  const top = d.upgrades[0];
  const done = s.adjustText ? `Sudah diterapkan: ${s.adjustText}. ` : "";
  return {
    text: `${done}${top ? `Saran teratas ${top.id} di jalur ${top.line}: naik ${fmt(top.gain)} L/jam, dari ${fmt(top.from)} ke ${fmt(top.from + top.gain)} L/jam.` : "Tidak ada upgrade lain yang menambah produksi dengan pengaturan sekarang."} [simulasi]`,
    links: [{ label: "Buka Rekomendasi upgrade", href: "/rencana/upgrade" }],
  };
}

function answerOf(d: Data, id: string) { return d.answers.find(a => a.id === id)!; }

function bay(d: Data, s: State): Reply {
  const a = answerOf(d, "bay2");
  return { text: `${a.title}. ${a.conclusion}${approved(s) ? " Rekomendasi sudah disetujui, jadi RT-26 pindah ke Bay 1." : ""} [simulasi]`, links: [{ label: "Buka Bay & Tangki", href: "/tangki" }, { label: "Buka Kelayakan & keputusan", href: "/rencana" }], lastAsset: "Bay 2" };
}

function genealogy(d: Data, s: State, id: "backward" | "forward"): Reply {
  const a = answerOf(d, id);
  const hold = s.holds.find(h => h.trigger === "FG-1013-07" && h.status !== "ditolak");
  return { text: `${a.title}. ${a.conclusion}${hold ? ` Daftar hold ${hold.id} sudah diajukan oleh ${hold.by} pukul ${hold.at}, statusnya ${hold.status}.` : ""} [simulasi]`, links: [{ label: "Lihat Riwayat Produksi", href: "/riwayat-produksi" }, { label: "Buka Hold Produk", href: "/hold" }] };
}

function halaman(d: Data, s: State): Reply {
  const p = section(s.page);
  if (p === "/receiving" || p === "/lab") return antrean(d, s);
  if (p === "/rencana") return rencana(d, s);
  if (p === "/riwayat-produksi") return genealogy(d, s, "backward");
  return kendala(d, s);
}

const STEP: Partial<Record<Intent, string>> = {
  kendala: "Memeriksa status semua alat", status: "Membaca kondisi alat", dampak: "Menelusuri jalur pipa ke hilir", jalur: "Menelusuri jalur pipa ke hulu",
  asal: "Menelusuri genealogi lot", sebaran: "Menelusuri sebaran RT", bay: "Membaca jadwal bay dan CIP", antrean: "Membaca antrean truk",
  upgrade: "Menghitung pasokan dan kebutuhan jalur", rencana: "Memeriksa 6 constraint rencana", halaman: "Membaca halaman yang dibuka",
};

/** Langkah yang ditampilkan animasi berpikir, sesuai maksud pertanyaan. */
export function thinkingSteps(question: string) {
  const step = STEP[classify(question).intent as Intent];
  return ["Memahami pertanyaan", ...(step ? [step] : []), "Menyusun jawaban"];
}

export function reply(question: string, d: Data, s: State): Reply {
  const { intent } = classify(question);
  if (!intent) return unknown;
  const named = findAsset(d.assets.map(a => a.id), question);
  const id = named ?? s.lastAsset;
  const asset = d.assets.find(a => a.id === id);
  const needAsset: Reply = { text: "Alat mana yang kamu maksud? Sebutkan kodenya, misalnya UHT-2, AT-2, atau F2.", links: [] };
  const alur: Link = { label: "Lihat di Alur", href: "/alur" };

  switch (intent) {
    case "bantuan": return { text: `Halo ${s.user.split(" ")[0]}, kamu masuk sebagai ${s.roleLabel}. ${s.roleFocus} Tanyakan kendala alur susu, jalur dan dampak alat, asal lot, antrean truk, upgrade, atau rencana shift. Jawabanku dihitung dari data dan kondisi aplikasi saat ini.`, links: [] };
    case "kendala": return kendala(d, s);
    case "antrean": return antrean(d, s);
    case "rencana": return rencana(d, s);
    case "upgrade": return upgrade(d, s);
    case "halaman": return halaman(d, s);
    case "asal": return genealogy(d, s, "backward");
    case "sebaran": return genealogy(d, s, "forward");
    case "bay": if (!named || named === "Bay 2") return bay(d, s); // alat lain dijawab sebagai status
    case "status":
      if (!asset) return needAsset;
      return { text: `${SNAPSHOT}, ${asset.id} berstatus ${asset.status}.${asset.note ? ` ${asset.note}.` : ""} [simulasi]`, links: [alur, { label: "Buka Kondisi Alat", href: "/kondisi-alat" }], lastAsset: asset.id };
    case "dampak": {
      if (!asset) return needAsset;
      const after = walk(d.links, asset.id, 1);
      return { text: `Kalau ${asset.id} berhenti, yang ikut tertahan sesudahnya: ${after.length ? list(after) : "tidak ada alat lain"}. Sekarang statusnya ${asset.status}. [asumsi jalur pipa]`, links: [alur], lastAsset: asset.id };
    }
    case "jalur": {
      if (!asset) return needAsset;
      const before = walk(d.links, asset.id, 0).reverse();
      return { text: before.length ? `Susu ke ${asset.id} melewati ${list(before)}. [asumsi jalur pipa]` : `${asset.id} adalah titik awal alur, belum ada alat sebelumnya di data.`, links: [alur], lastAsset: asset.id };
    }
  }
}
