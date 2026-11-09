import type { Metadata } from "next";
import { Onest, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import { RencanaProvider } from "@/components/rencana/rencana-state";
import "./globals.css";
const onest = Onest({ subsets: ["latin"], display: "swap", variable: "--font-onest" });
const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-jetbrains" });
export const metadata: Metadata = { title: "MilkGraph | Operasional Pabrik Susu", description: "Mockup operasional pabrik susu: monitor, telusuri bukti, dan rencanakan pemulihan. Semua data simulasi." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={`${onest.variable} ${mono.variable}`}><RencanaProvider><AppShell>{children}</AppShell></RencanaProvider></body></html>;
}
