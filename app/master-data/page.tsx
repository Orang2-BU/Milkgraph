import { MasterDataView } from "@/components/master-data/master-data";

export const metadata = {
  title: "Katalog Master | MilkGraph",
  description: "Katalog konfigurasi master Greenfields v2.1: aset, rute, SKU, dedikasi lini, dan aturan changeover CIP.",
};

export default function MasterDataPage() {
  return <MasterDataView />;
}
