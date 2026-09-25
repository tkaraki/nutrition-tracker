/** "400mg · 1 dose" / "2000 IU · 1 dose" / "1 dose" (when serving_unit is the
 * generic default) — dose x serving_unit as joined onto the RoutineItem /
 * RoutineDay response, never a separately-fetched Supplement's serving_unit,
 * so this never reads stale after a supplement edit. */
export function formatDose(doses: number, servingUnit: string): string {
  const doseLabel = `${doses} dose${doses === 1 ? "" : "s"}`;
  if (servingUnit.trim().toLowerCase() === "dose") return doseLabel;
  return `${servingUnit} · ${doseLabel}`;
}

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/** "10:32am" for an ISO timestamp, in the browser's local timezone. */
export function formatLogTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso)).replace(" ", "").toLowerCase();
}
