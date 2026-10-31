"use client";

import { useState } from "react";
import { Check, Minus, ShieldCheck } from "lucide-react";
import { setRole, useDemo } from "@/lib/demo";
import { PERMISSIONS, ROLE_IDS, ROLES, type Permission, type Role, type RoleId } from "@/lib/roles";
import { Badge, Card, Icon, PageHeading, SectionTitle } from "@/components/ui";
import { API_MODE } from "@/lib/api/client";
import { useResource } from "@/lib/api/resource";

interface RolesPayload {
  roles: Record<RoleId, Role>;
  permissions: Record<Permission, { label: string; roles: RoleId[] }>;
}

export function Pengguna() {
  const demo = useDemo();
  const rolesRes = useResource<RolesPayload>(API_MODE ? "/roles" : null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (API_MODE && rolesRes.loading && !rolesRes.data) {
    return (
      <div className="page-enter" role="status">
        <PageHeading title="Pengguna & Peran" subtitle="Empat peran dari proposal. Peran aktif menentukan keputusan yang boleh diambil di setiap halaman." />
        <p className="muted">Memuat data peran…</p>
      </div>
    );
  }

  if (API_MODE && rolesRes.error) {
    return (
      <div className="page-enter" role="alert">
        <PageHeading title="Pengguna & Peran" subtitle="Empat peran dari proposal. Peran aktif menentukan keputusan yang boleh diambil di setiap halaman." />
        <p className="crit-text">Gagal memuat peran: {rolesRes.error.message}</p>
      </div>
    );
  }

  const roleMap: Record<RoleId, Role> = API_MODE && rolesRes.data?.roles ? rolesRes.data.roles : ROLES;
  const roleIds: RoleId[] = API_MODE && rolesRes.data?.roles ? (Object.keys(rolesRes.data.roles) as RoleId[]) : ROLE_IDS;
  const permissionMap: Record<Permission, { label: string; roles: RoleId[] }> =
    API_MODE && rolesRes.data?.permissions ? rolesRes.data.permissions : PERMISSIONS;

  if (API_MODE && roleIds.length === 0) {
    return (
      <div className="page-enter" role="status">
        <PageHeading title="Pengguna & Peran" subtitle="Empat peran dari proposal. Peran aktif menentukan keputusan yang boleh diambil di setiap halaman." />
        <p className="muted">Tidak ada peran yang terdaftar.</p>
      </div>
    );
  }

  const handleRoleChange = async (id: RoleId) => {
    try {
      setSwitching(id);
      setActionError(null);
      await setRole(id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengubah peran aktif";
      setActionError(message);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="page-enter">
      <PageHeading title="Pengguna & Peran" subtitle="Empat peran dari proposal. Peran aktif menentukan keputusan yang boleh diambil di setiap halaman." />
      {actionError && (
        <p className="crit-text" role="alert" style={{ marginBottom: "1rem" }}>
          {actionError}
        </p>
      )}
      <div className="user-grid">
        {roleIds.map(id => {
          const r = roleMap[id];
          if (!r) return null;
          const active = demo.role === id;
          const isPending = switching === id;
          return (
            <Card key={id} className={`user-card ${active ? "active" : ""}`}>
              <div className="tank-top">
                <span className="avatar large">{r.initials}</span>
                {active && <Badge tone="ok">Peran aktif</Badge>}
              </div>
              <h2>{r.user}</h2>
              <p className="small muted">{r.label}</p>
              <p className="small">{r.focus}</p>
              <button
                className="button secondary wide"
                disabled={active || isPending}
                onClick={() => void handleRoleChange(id)}
              >
                {active ? "Sedang dipakai" : isPending ? "Mengubah peran…" : `Masuk sebagai ${r.label}`}
              </button>
            </Card>
          );
        })}
      </div>
      <Card>
        <SectionTitle title="Hak akses" subtitle="Semua peran bisa melihat semua halaman. Keputusan dibatasi per peran." />
        <div className="table-wrap">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Keputusan</th>
                {roleIds.map(id => (
                  <th key={id} className="numeric">
                    {roleMap[id]?.label ?? id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(permissionMap) as Permission[]).map(p => (
                <tr key={p}>
                  <td>{permissionMap[p]?.label ?? p}</td>
                  {roleIds.map(id => {
                    const yes = permissionMap[p]?.roles?.includes(id);
                    return (
                      <td key={id} data-label={roleMap[id]?.label ?? id} className="numeric">
                        <Icon icon={yes ? Check : Minus} size={16} className={yes ? "ok-text" : "muted"} />
                        <span className="sr-only">{yes ? "Boleh" : "Tidak"}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted with-icon">
          <Icon icon={ShieldCheck} size={14} />
          Manusia yang memutuskan: rekomendasi jadwal dan daftar hold tidak berlaku sebelum disetujui peran yang berwenang. Login sungguhan di luar scope mockup.
        </p>
      </Card>
    </div>
  );
}
