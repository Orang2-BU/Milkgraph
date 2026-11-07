"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, Icon, PageHeading, SourceModal } from "@/components/ui";
import { Equipment } from "@/components/trace/equipment";
import { number } from "@/lib/format";
import { OUTPUTS } from "@/mock/outputs";
import { EMPTY, OutputPicker, matchOutputs, type Filters } from "./output-picker";
import { ProductionPath, kindOf } from "./production-path";
import { buildSteps, durationText } from "./timeline";
import { QualityCard } from "./quality-card";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const dateText = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

/** Riwayat Produksi: pilih output, lalu ikuti jalurnya dari asal susu sampai produk selesai (poin 8). */
export function RiwayatProduksi() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [picked, setPicked] = useState("FG-1013-07");
  const [active, setActive] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const list = matchOutputs(OUTPUTS, filters);
  const output = list.find(o => o.id === picked) ?? list[0];
  const select = (id: string) => { setPicked(id); setActive(null); };
  const update = (f: Filters) => { setFilters(f); setActive(null); };
  const steps = output ? buildSteps(output.chain) : [];
  const step = steps[active ?? steps.length - 1];

  return <div className="page-enter">
    <PageHeading title="Riwayat Produksi" subtitle="Pilih hasil produksi, lalu ikuti jalurnya dari asal susu sampai produk selesai.">
      <Link className="button secondary" href="/graph">Context Graph<Icon icon={ArrowRight} size={16} /></Link>
    </PageHeading>
    <OutputPicker outputs={OUTPUTS} filters={filters} setFilters={update} selected={output?.id ?? ""} onSelect={select}
      onExample={() => { update({ ...EMPTY, product: "UHT Stroberi 200 ml", time: "16:00" }); setPicked("FG-1012-11"); }} />

    {!output ? <Card className="rp-empty"><p>Tidak ada output yang cocok dengan pilihan ini.</p><button type="button" className="button secondary" onClick={() => update(EMPTY)}>Reset pilihan</button></Card> : <>
      <Card className="rp-summary">
        <Equipment kind="Lot" size={52} />
        <div className="rp-summary-main"><span>Output terpilih</span><h2>{output.product}</h2><span className="mono">{output.id}</span></div>
        <dl>
          <div><dt>Selesai produksi</dt><dd>{output.end ?? "Belum tercatat"}<small>{dateText(output.date)}</small></dd></div>
          <div><dt>Jumlah output</dt><dd className="rp-big">{number(output.packs)} pak<small>Lini {output.line}</small></dd></div>
          <div><dt>Asal susu</dt><dd>{output.farm}<small>{output.chain[0]?.to}</small></dd></div>
        </dl>
      </Card>

      <div className="rp-layout">
        <ProductionPath output={output} active={active ?? steps.length - 1} onPick={setActive} />
        {step && <aside className="rp-detail" aria-live="polite">
          <span className="small muted">Tahap {step.index + 1} dari {steps.length}</span>
          <header><Equipment kind={kindOf(step.step)} size={48} /><h2>{step.step}</h2></header>
          <dl className="flow-facts">
            <div><dt>Mulai - selesai</dt><dd>{step.window ? `${step.window.day} ${step.window.startText} - ${step.window.endText}` : "Belum tercatat"}</dd></div>
            <div><dt>Durasi tercatat</dt><dd>{step.window ? durationText(step.duration) : "-"}</dd></div>
            <div><dt>Asal</dt><dd>{step.from}</dd></div>
            <div><dt>Tujuan</dt><dd>{step.to}</dd></div>
            <div><dt>Batch / lot</dt><dd className="mono">{step.batch}</dd></div>
            <div><dt>Volume / jumlah</dt><dd>{step.volume}</dd></div>
            <div><dt>Dasar pencatatan</dt><dd>{step.record}</dd></div>
          </dl>
          {step.gap && <p className="small rp-note">Serah-terima di tahap ini tidak tercatat langsung; disambungkan dari irisan waktu dan level tangki.</p>}
          {step.source ? <button type="button" className="button secondary wide" onClick={() => setSource(step.source)}>Lihat bukti proses<Icon icon={ArrowUpRight} size={16} /></button>
            : <p className="small muted">Bukti proses belum tersedia di data simulasi.</p>}
        </aside>}
      </div>

      <QualityCard output={output} onSource={setSource} />
    </>}
    <SourceModal id={source} onClose={() => setSource(null)} />
  </div>;
}
