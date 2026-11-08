import { RencanaProvider } from "@/components/rencana/rencana-state";
export default function Layout({ children }: { children: React.ReactNode }) { return <RencanaProvider>{children}</RencanaProvider>; }
