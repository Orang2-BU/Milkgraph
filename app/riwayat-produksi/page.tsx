import { RiwayatProduksi } from "@/components/riwayat/riwayat-produksi";

export const metadata = { title: "Riwayat Produksi | MilkGraph" };

export default async function Page({ searchParams }: { searchParams: Promise<{ lot?: string }> }) {
  const { lot } = await searchParams;
  return <RiwayatProduksi lot={lot} />;
}
