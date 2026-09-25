import { apiFetch } from "./client";
import { NUTRIENT_KEYS } from "../lib/nutrients";
import type { MealPlan, MealPlanIngredient, MealPlanRecipe, MealType } from "./types";

/**
 * Every id here is a BIGSERIAL/BIGINT and every servings/quantity_g value is
 * NUMERIC — both arrive as strings on read (src/db/pool.ts's type parser
 * comment) but write endpoints (addRecipeToPlan, addIngredientToPlan, etc.)
 * validate z.number(). Coerce on every read here so nothing downstream sees
 * a numeric string.
 */

interface RawMealPlanRecipe {
  id: number | string;
  meal_plan_id: number | string;
  recipe_id: number | string;
  servings: number | string;
  eaten_at: string | null;
  title?: string;
}

/** Nutrient columns are `i.<key> * mpi.quantity_g / 100` server-side —
 *  already numeric-string per-row amounts, same coercion as everywhere else. */
type RawMealPlanIngredient = {
  id: number | string;
  meal_plan_id: number | string;
  ingredient_id: number | string;
  quantity_g: number | string;
  eaten_at: string | null;
  name: string;
} & Record<(typeof NUTRIENT_KEYS)[number], number | string>;

interface RawMealPlan {
  id: number | string;
  user_id: number | string;
  plan_date: string;
  meal_type: MealType;
  created_at: string;
  recipes?: RawMealPlanRecipe[];
  ingredients?: RawMealPlanIngredient[];
}

function toMealPlanRecipe(raw: RawMealPlanRecipe): MealPlanRecipe {
  return {
    id: Number(raw.id),
    meal_plan_id: Number(raw.meal_plan_id),
    recipe_id: Number(raw.recipe_id),
    servings: Number(raw.servings),
    eaten_at: raw.eaten_at,
    ...(raw.title !== undefined ? { title: raw.title } : {}),
  };
}

function toMealPlanIngredient(raw: RawMealPlanIngredient): MealPlanIngredient {
  const nutrients = Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, Number(raw[key])])) as Record<
    (typeof NUTRIENT_KEYS)[number],
    number
  >;
  return {
    ...nutrients,
    id: Number(raw.id),
    meal_plan_id: Number(raw.meal_plan_id),
    ingredient_id: Number(raw.ingredient_id),
    quantity_g: Number(raw.quantity_g),
    eaten_at: raw.eaten_at,
    name: raw.name,
  };
}

function toMealPlan(raw: RawMealPlan): MealPlan {
  return {
    id: Number(raw.id),
    user_id: Number(raw.user_id),
    plan_date: raw.plan_date,
    meal_type: raw.meal_type,
    created_at: raw.created_at,
    recipes: (raw.recipes ?? []).map(toMealPlanRecipe),
    ingredients: (raw.ingredients ?? []).map(toMealPlanIngredient),
  };
}

/** GET /api/meal-plans?from=YYYY-MM-DD&to=YYYY-MM-DD — omit either bound to leave it open-ended. */
export function listMealPlans(from?: string, to?: string): Promise<MealPlan[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return apiFetch<RawMealPlan[]>(`/api/meal-plans${qs ? `?${qs}` : ""}`).then((rows) => rows.map(toMealPlan));
}

/** POST /api/meal-plans — get-or-create the (plan_date, meal_type) slot. */
export function upsertMealPlan(plan_date: string, meal_type: MealType): Promise<MealPlan> {
  return apiFetch<RawMealPlan>("/api/meal-plans", {
    method: "POST",
    body: JSON.stringify({ plan_date, meal_type }),
  }).then(toMealPlan);
}

/** DELETE /api/meal-plans/:id — removes the whole plan slot (and its recipes, via ON DELETE CASCADE). */
export function deleteMealPlan(id: number): Promise<void> {
  return apiFetch<void>(`/api/meal-plans/${id}`, { method: "DELETE" });
}

/** POST /api/meal-plans/:id/recipes — assign a recipe to a plan slot. */
export function addRecipeToPlan(mealPlanId: number, recipeId: number, servings = 1): Promise<MealPlanRecipe> {
  return apiFetch<RawMealPlanRecipe>(`/api/meal-plans/${mealPlanId}/recipes`, {
    method: "POST",
    body: JSON.stringify({ recipe_id: recipeId, servings }),
  }).then(toMealPlanRecipe);
}

/** PATCH /api/meal-plan-recipes/:id — adjust servings and/or mark eaten/not-eaten. */
export function updateMealPlanRecipe(
  id: number,
  updates: { servings?: number; eaten?: boolean },
): Promise<MealPlanRecipe> {
  return apiFetch<RawMealPlanRecipe>(`/api/meal-plan-recipes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  }).then(toMealPlanRecipe);
}

/** Convenience wrapper over updateMealPlanRecipe for the eaten/not-eaten toggle. */
export function setRecipeEaten(id: number, eaten: boolean): Promise<MealPlanRecipe> {
  return updateMealPlanRecipe(id, { eaten });
}

/** DELETE /api/meal-plan-recipes/:id — removes one recipe from its plan slot. */
export function removeRecipeFromPlan(id: number): Promise<void> {
  return apiFetch<void>(`/api/meal-plan-recipes/${id}`, { method: "DELETE" });
}

/** POST /api/meal-plans/:id/ingredients — log an ingredient straight to a plan slot. */
export function addIngredientToPlan(
  mealPlanId: number,
  ingredientId: number,
  quantityG: number,
  eaten = false,
): Promise<MealPlanIngredient> {
  return apiFetch<RawMealPlanIngredient>(`/api/meal-plans/${mealPlanId}/ingredients`, {
    method: "POST",
    body: JSON.stringify({ ingredient_id: ingredientId, quantity_g: quantityG, eaten }),
  }).then(toMealPlanIngredient);
}

/** PATCH /api/meal-plan-ingredients/:id — adjust quantity_g and/or mark eaten/not-eaten. */
export function updateMealPlanIngredient(
  id: number,
  updates: { quantity_g?: number; eaten?: boolean },
): Promise<MealPlanIngredient> {
  return apiFetch<RawMealPlanIngredient>(`/api/meal-plan-ingredients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  }).then(toMealPlanIngredient);
}

/** Convenience wrapper over updateMealPlanIngredient for the eaten/not-eaten toggle. */
export function setIngredientEaten(id: number, eaten: boolean): Promise<MealPlanIngredient> {
  return updateMealPlanIngredient(id, { eaten });
}

/** DELETE /api/meal-plan-ingredients/:id — removes one direct ingredient from its plan slot. */
export function removeIngredientFromPlan(id: number): Promise<void> {
  return apiFetch<void>(`/api/meal-plan-ingredients/${id}`, { method: "DELETE" });
}
