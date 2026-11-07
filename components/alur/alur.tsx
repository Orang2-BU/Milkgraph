"use client";

import { PageHeading } from "@/components/ui";
import { ASSETS } from "@/lib/assets";
import { FlowCanvas, type AsideProps } from "./flow-canvas";
import { AssetInfo } from "./asset-info";

const Info = ({ asset, onPick, onClose }: AsideProps) => <AssetInfo asset={asset} assets={ASSETS} onPick={onPick} onClose={onClose} />;

/** Tampilan default Operasional: alur alat produksi. Klik alat untuk melihat info alatnya. Susunan alat mengikuti data plant. */
export function Alur() {
  return <div className="page-enter">
    <PageHeading title="Alur Produksi" subtitle="Alur susu dari bay bongkar sampai mesin filling, sesuai snapshot pukul 14.42." />
    <FlowCanvas label="Alur produksi" hint="Klik alat untuk melihat infonya"
      aside={Info} />
  </div>;
}
