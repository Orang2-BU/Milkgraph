export type RoleId = "planner" | "receiving" | "supervisor" | "qa";
export type Permission = "demand.send" | "plan.decide" | "constraint.edit" | "hold.submit" | "hold.review" | "lab.decide" | "instruction.ack";

export const ROLES: Record<RoleId, { label: string; user: string; initials: string; focus: string }> = {
  planner: { label: "Planner PPIC", user: "Rina Wulandari", initials: "RW", focus: "Rencana shift yang layak dan keputusan saat gangguan." },
  receiving: { label: "Koordinator receiving", user: "Dimas Prasetyo", initials: "DP", focus: "Urutan RT, bay yang siap, dan RT yang mendekati batas holding time." },
  supervisor: { label: "Supervisor produksi", user: "Hendra Kusuma", initials: "HK", focus: "Lokasi bottleneck dan dampaknya ke lini filling." },
  qa: { label: "QA/Lab", user: "Sri Lestari", initials: "SL", focus: "Hasil lab, lot terdampak beserta proporsi volume, dan daftar hold." },
};
export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

export const PERMISSIONS: Record<Permission, { label: string; roles: RoleId[] }> = {
  "demand.send": { label: "Mengirim kebutuhan susu ke farm", roles: ["planner"] },
  "plan.decide": { label: "Menyetujui atau menolak rekomendasi rencana", roles: ["planner"] },
  "constraint.edit": { label: "Mengubah batas constraint", roles: ["planner"] },
  "instruction.ack": { label: "Mengonfirmasi instruksi dari rencana yang disetujui", roles: ["receiving", "supervisor"] },
  "hold.submit": { label: "Mengajukan daftar hold dari hasil trace", roles: ["planner", "supervisor", "qa"] },
  "hold.review": { label: "Menyetujui, menolak, atau melepas hold", roles: ["qa"] },
  "lab.decide": { label: "Merilis atau menolak hasil lab penerimaan RT", roles: ["qa"] },
};
export const can = (role: RoleId, permission: Permission) => PERMISSIONS[permission].roles.includes(role);
/** Kalimat untuk tombol yang dinonaktifkan karena peran. */
export const whoCan = (permission: Permission) => `Hanya ${PERMISSIONS[permission].roles.map(r => ROLES[r].label).join(" atau ")} yang dapat melakukan ini.`;
