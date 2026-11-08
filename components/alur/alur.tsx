"use client";

import { useState } from "react";
import { PageHeading, Toggle } from "@/components/ui";
import { ASSETS } from "@/lib/assets";
import { FlowCanvas, type AsideProps } from "./flow-canvas";
import { AssetInfo } from "./asset-info";

const Info = ({ asset, onPick, onClose }: AsideProps) => <AssetInfo asset={asset} assets={ASSETS} onPick={onPick} onClose={onClose} />;

/** Tampilan default Operasional: alur alat produksi, digambar 2D atau 3D (poin 14). Klik alat untuk melihat info alatnya. */
export function Alur() {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  return <div className="page-enter">
    <PageHeading title="Alur Produksi" subtitle="Alur susu dari bay bongkar sampai mesin filling, sesuai snapshot pukul 14.42." />
    <div className="page-tabs"><Toggle label="Jenis tampilan" value={mode} onChange={setMode} options={[{ value: "2d", label: "Alur 2D" }, { value: "3d", label: "Alur 3D" }]} /></div>
    <FlowCanvas mode={mode} label="Alur produksi" hint="Klik alat untuk melihat infonya" aside={Info} />
  </div>;
}
