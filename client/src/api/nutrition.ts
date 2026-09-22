import { apiFetch } from "./client";
import type { DailyNutrition, NutritionRange } from "./types";

/**
 * src/lib/nutritionRange.ts converts every value to a plain JS number
 * server-side before responding (see its module doc comment) — unlike the
 * rest of the API, these two endpoints need NO string->number coercion here.
 */

export function getDailyNutrition(date: string): Promise<DailyNutrition> {
  return apiFetch<DailyNutrition>(`/api/nutrition/daily?date=${encodeURIComponent(date)}`);
}

export function getNutritionRange(from: string, to: string): Promise<NutritionRange> {
  return apiFetch<NutritionRange>(
    `/api/nutrition/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}
