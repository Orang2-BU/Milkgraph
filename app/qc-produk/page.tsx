import { Lab } from "@/components/lab/lab";

export const metadata = { title: "QC Barang Jadi | MilkGraph" };

export default async function Page({ searchParams }: { searchParams: Promise<{ lot?: string }> }) {
  const { lot } = await searchParams;
  return <Lab kind="qc-fg" lot={lot} />;
}
