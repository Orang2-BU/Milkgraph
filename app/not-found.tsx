import Link from "next/link";
export default function NotFound() { return <div className="placeholder-card"><h1>Halaman tidak ditemukan</h1><p>Pilih halaman dari menu atau kembali ke Monitor.</p><Link className="button secondary" href="/">Kembali ke Monitor</Link></div>; }
