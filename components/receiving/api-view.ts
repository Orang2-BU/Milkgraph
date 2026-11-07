export function receivingHeadline(
  check: { violations: { before: number } },
  decisions: { plan: string; status: string }[],
  incident: { rt: string },
) {
  return decisions.some(d => d.plan === "current" && d.status === "approved")
    ? `Rekomendasi disetujui, ${incident.rt} pindah ke Bay 1.`
    : `Rencana tidak layak, ${check.violations.before} constraint dilanggar.`;
}
