"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck, CircleDashed, TriangleAlert, type LucideIcon } from "lucide-react";
import { Badge, Card, Icon, SectionTitle, SourceButton } from "@/components/ui";
import type { Tone } from "@/mock/types";
import type { Output } from "@/mock/outputs";

/** Hasil QC barang jadi untuk lot terpilih dan langkah berikutnya. Selalu terbuka, satu dari tiga kondisi. */
export function QualityCard({ output, onSource }: { output: Output; onSource: (id: string) => void }) {
  const qc = output.qc;
  const state: { icon: LucideIcon; tone: Tone; label: string; text: string; action: React.ReactNode } =
    qc?.status === "out-of-spec" ? {
      icon: TriangleAlert, tone: "crit", label: "QC out-of-spec", text: qc.note,
      action: <Link className="button primary" href="/trace">Telusuri dan ajukan hold<Icon icon={ArrowRight} size={16} /></Link>,
    } : qc ? {
      icon: CircleCheck, tone: "ok", label: "QC lulus", text: qc.note,
      action: <Link className="button secondary" href={`/qc-produk?lot=${output.id}`}>Lihat QC Barang Jadi<Icon icon={ArrowRight} size={16} /></Link>,
    } : {
      icon: CircleDashed, tone: "neutral", label: "Belum diuji", text: `Belum ada hasil QC barang jadi untuk ${output.id}. Lot lain dari batch yang sama: ${output.chain.at(-1)?.batch}.`,
      action: <Link className="button secondary" href="/qc-produk">Lihat QC Barang Jadi<Icon icon={ArrowRight} size={16} /></Link>,
    };

  return <Card className="rp-quality">
    <SectionTitle title="Mutu & tindak lanjut" subtitle="Hasil QC barang jadi untuk lot ini dan langkah berikutnya." />
    <div className={`rp-quality-row ${state.tone}`}>
      <span className="rp-quality-icon"><Icon icon={state.icon} size={22} /></span>
      <div className="rp-quality-copy">
        <div className="rp-quality-head"><Badge tone={state.tone}>{state.label}</Badge><span className="mono">{output.id}</span>{qc?.lab && <SourceButton id={qc.lab} onSelect={onSource} compact />}</div>
        <p>{state.text}</p>
      </div>
      <div className="rp-quality-action">{state.action}</div>
    </div>
  </Card>;
}
