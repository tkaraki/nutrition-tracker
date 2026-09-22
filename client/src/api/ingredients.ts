import { apiFetch } from "./client";
import type { CreateIngredientInput, Ingredient } from "./types";

/**
 * Ingredient ids are BIGSERIAL and every nutrient/serving_size_g column is
 * NUMERIC — strings on read, but write endpoints validate z.number().
 * Coerce on every read here. `fdc_id` is a plain INTEGER (not BIGINT), so
 * node-postgres already returns it as a number — no coercion needed for it.
 */

interface RawIngredient {
  id: number | string;
  name: string;
  fdc_id: number | null;
  serving_size_g: number | string | null;
  calories_kcal: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  fiber_g: number | string;
  sodium_mg: number | string;
  potassium_mg: number | string;
  calcium_mg: number | string;
  iron_mg: number | string;
  vitamin_c_mg: number | string;
  vitamin_d_mcg: number | string;
  extra_micros_json: Record<string, number>;
  created_at: string;
  updated_at: string;
}

function toIngredient(raw: RawIngredient): Ingredient {
  return {
    id: Number(raw.id),
    name: raw.name,
    fdc_id: raw.fdc_id,
    serving_size_g: raw.serving_size_g === null ? null : Number(raw.serving_size_g),
    calories_kcal: Number(raw.calories_kcal),
    protein_g: Number(raw.protein_g),
    carbs_g: Number(raw.carbs_g),
    fat_g: Number(raw.fat_g),
    fiber_g: Number(raw.fiber_g),
    sodium_mg: Number(raw.sodium_mg),
    potassium_mg: Number(raw.potassium_mg),
    calcium_mg: Number(raw.calcium_mg),
    iron_mg: Number(raw.iron_mg),
    vitamin_c_mg: Number(raw.vitamin_c_mg),
    vitamin_d_mcg: Number(raw.vitamin_d_mcg),
    extra_micros_json: raw.extra_micros_json,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

/** GET /api/ingredients?search=&limit=&offset= — search matches name via ILIKE. */
export function listIngredients(search?: string, limit?: number, offset?: number): Promise<Ingredient[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();
  return apiFetch<RawIngredient[]>(`/api/ingredients${qs ? `?${qs}` : ""}`).then((rows) => rows.map(toIngredient));
}

/** GET /api/ingredients/:id */
export function getIngredient(id: number): Promise<Ingredient> {
  return apiFetch<RawIngredient>(`/api/ingredients/${id}`).then(toIngredient);
}

/** POST /api/ingredients — nutrient fields default to 0 server-side if omitted. */
export function createIngredient(input: CreateIngredientInput): Promise<Ingredient> {
  return apiFetch<RawIngredient>("/api/ingredients", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(toIngredient);
}

/** PATCH /api/ingredients/:id — partial update; every field optional. */
export function updateIngredient(id: number, updates: Partial<CreateIngredientInput>): Promise<Ingredient> {
  return apiFetch<RawIngredient>(`/api/ingredients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  }).then(toIngredient);
}

/** DELETE /api/ingredients/:id */
export function deleteIngredient(id: number): Promise<void> {
  return apiFetch<void>(`/api/ingredients/${id}`, { method: "DELETE" });
}
