/**
 * Mirrors the backend's fixed nutrient key list (src/lib/nutrients.ts) —
 * that file is the source of truth for which keys exist; this file only
 * adds frontend display metadata (label/unit/order/primary) the backend
 * has no concept of. Keep in sync manually if the backend list changes.
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

export interface NutrientDisplayMeta {
  label: string;
  unit: string;
  /** Display order across the whole nutrient set; primary tiles (1-4) first. */
  order: number;
  /** true for the 4 always-visible tiles (calories/protein/carbs/fat); false = collapsed-by-default. */
  primary: boolean;
}

export const NUTRIENT_DISPLAY: Record<NutrientKey, NutrientDisplayMeta> = {
  calories_kcal: { label: "Calories", unit: "kcal", order: 1, primary: true },
  protein_g: { label: "Protein", unit: "g", order: 2, primary: true },
  carbs_g: { label: "Carbs", unit: "g", order: 3, primary: true },
  fat_g: { label: "Fat", unit: "g", order: 4, primary: true },
  fiber_g: { label: "Fiber", unit: "g", order: 5, primary: false },
  sodium_mg: { label: "Sodium", unit: "mg", order: 6, primary: false },
  potassium_mg: { label: "Potassium", unit: "mg", order: 7, primary: false },
  calcium_mg: { label: "Calcium", unit: "mg", order: 8, primary: false },
  iron_mg: { label: "Iron", unit: "mg", order: 9, primary: false },
  vitamin_c_mg: { label: "Vitamin C", unit: "mg", order: 10, primary: false },
  vitamin_d_mcg: { label: "Vitamin D", unit: "mcg", order: 11, primary: false },
};
