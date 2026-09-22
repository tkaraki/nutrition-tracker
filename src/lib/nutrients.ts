/**
 * The fixed set of nutrient keys tracked throughout the app. Must stay in
 * sync with: the column names in the `ingredients`/`supplements` tables,
 * the `daily_nutrient_totals` view's output columns, and the values
 * allowed in `nutrient_targets.nutrient_key`. One list, used everywhere,
 * so the three can't silently drift apart.
 */
export const NUTRIENT_KEYS = [
  "calories_kcal",
  "protein_g",
  "carbs_g",
  "fat_g",
  "fiber_g",
  "sodium_mg",
  "potassium_mg",
  "calcium_mg",
  "iron_mg",
  "vitamin_c_mg",
  "vitamin_d_mcg",
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

/** Zero-filled totals, used for a day that has no rows in daily_nutrient_totals at all. */
export function emptyTotals(): Record<NutrientKey, number> {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Record<NutrientKey, number>;
}
