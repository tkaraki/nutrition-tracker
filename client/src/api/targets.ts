import { apiFetch } from "./client";
import type { NutrientKey } from "../lib/nutrients";
import type { NutrientTargets } from "./types";

/**
 * Targets are already plain numbers on the wire (nutrient_targets.daily_target
 * is NUMERIC but small/simple enough that node-postgres round-trips it fine
 * here — still coerce defensively since every other NUMERIC column in this
 * app comes back as a string).
 */

interface RawTarget {
  nutrient_key: NutrientKey;
  daily_target: number | string;
}

/** GET /api/nutrient-targets — only the keys the user has set; unset keys are absent. */
export function listNutrientTargets(): Promise<NutrientTargets> {
  return apiFetch<RawTarget[]>("/api/nutrient-targets").then((rows) => {
    const targets: NutrientTargets = {};
    for (const row of rows) targets[row.nutrient_key] = Number(row.daily_target);
    return targets;
  });
}

/** PUT /api/nutrient-targets/:key — set (create or replace) one target.
 *  Note: PUT 0 sets a target of exactly zero, it does NOT clear it — use
 *  deleteNutrientTarget() for "no target" (see architecture doc). */
export function setNutrientTarget(key: NutrientKey, dailyTarget: number): Promise<void> {
  return apiFetch<RawTarget>(`/api/nutrient-targets/${key}`, {
    method: "PUT",
    body: JSON.stringify({ daily_target: dailyTarget }),
  }).then(() => undefined);
}

/** DELETE /api/nutrient-targets/:key — clears a target entirely. */
export function deleteNutrientTarget(key: NutrientKey): Promise<void> {
  return apiFetch<void>(`/api/nutrient-targets/${key}`, { method: "DELETE" });
}
