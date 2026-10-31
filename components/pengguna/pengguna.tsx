"use client";

import { Check, Minus, ShieldCheck } from "lucide-react";
import { setRole, useDemo } from "@/lib/demo";
import { PERMISSIONS, ROLE_IDS, ROLES, type Permission } from "@/lib/roles";
import { Badge, Card, Icon, PageHeading, SectionTitle } from "@/components/ui";

export function Pengguna() {
  const demo = useDemo();
  return <div className="page-enter">
    <PageHeading title="Pengguna & Peran" subtitle="Empat peran dari proposal. Peran aktif menentukan keputusan yang boleh diambil di setiap halaman." />
    <div className="user-grid">{ROLE_IDS.map(id => { const r = ROLES[id]; const active = demo.role === id; return <Card key={id} className={`user-card ${active ? "active" : ""}`}>
      <div className="tank-top"><span className="avatar large">{r.initials}</span>{active && <Badge tone="ok">Peran aktif</Badge>}</div>
      <h2>{r.user}</h2><p className="small muted">{r.label}</p><p className="small">{r.focus}</p>
      <button className="button secondary wide" disabled={active} onClick={() => setRole(id)}>{active ? "Sedang dipakai" : `Masuk sebagai ${r.label}`}</button>
    </Card>; })}</div>
    <Card><SectionTitle title="Hak akses" /><div className="table-wrap"><table className="matrix-table"><thead><tr><th>Keputusan</th>{ROLE_IDS.map(id => <th key={id} className="numeric">{ROLES[id].label}</th>)}</tr></thead><tbody>{(Object.keys(PERMISSIONS) as Permission[]).map(p => <tr key={p}><td>{PERMISSIONS[p].label}</td>{ROLE_IDS.map(id => { const yes = PERMISSIONS[p].roles.includes(id); return <td key={id} data-label={ROLES[id].label} className="numeric"><Icon icon={yes ? Check : Minus} size={16} className={yes ? "ok-text" : "muted"} /><span className="sr-only">{yes ? "Boleh" : "Tidak"}</span></td>; })}</tr>)}</tbody></table></div><p className="small muted with-icon"><Icon icon={ShieldCheck} size={14} />Manusia yang memutuskan: rekomendasi jadwal dan daftar hold tidak berlaku sebelum disetujui peran yang berwenang. Login sungguhan di luar scope mockup.</p></Card>
  </div>;
}
