import { apiFetch } from "./client";
import type {
  CreatedRecipe,
  CreateRecipeInput,
  Recipe,
  RecipeDetail,
  RecipeIngredientInput,
  ReplaceRecipeIngredientsResult,
  UpdateRecipeInput,
} from "./types";

/**
 * Recipe ids and `servings` are BIGSERIAL/NUMERIC — strings on read, but
 * write endpoints validate z.number(). Coerce on every read here.
 *
 * Note: GET /api/recipes has NO `search`/filter query param support in the
 * current backend (src/routes/recipes.ts just does `SELECT * FROM recipes
 * WHERE user_id = $1 ORDER BY created_at DESC` — unlike ingredients, which
 * does support `?search=`). listRecipes() below always returns the full
 * list; a recipe picker needs to filter client-side for now.
 */

interface RawRecipe {
  id: number | string;
  user_id: number | string;
  title: string;
  instructions: string | null;
  source_url: string | null;
  servings: number | string;
  created_at: string;
  updated_at: string;
}

function toRecipe(raw: RawRecipe): Recipe {
  return {
    id: Number(raw.id),
    user_id: Number(raw.user_id),
    title: raw.title,
    instructions: raw.instructions,
    source_url: raw.source_url,
    servings: Number(raw.servings),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

interface RawRecipeIngredientDetail {
  id: number | string;
  quantity_g: number | string;
  note: string | null;
  sort_order: number;
  ingredient_id: number | string;
  name: string;
  calories_kcal: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  fiber_g: number | string;
}

interface RawRecipeDetail extends RawRecipe {
  ingredients: RawRecipeIngredientDetail[];
}

function toRecipeDetail(raw: RawRecipeDetail): RecipeDetail {
  return {
    ...toRecipe(raw),
    ingredients: raw.ingredients.map((ing) => ({
      id: Number(ing.id),
      quantity_g: Number(ing.quantity_g),
      note: ing.note,
      sort_order: ing.sort_order,
      ingredient_id: Number(ing.ingredient_id),
      name: ing.name,
      calories_kcal: Number(ing.calories_kcal),
      protein_g: Number(ing.protein_g),
      carbs_g: Number(ing.carbs_g),
      fat_g: Number(ing.fat_g),
      fiber_g: Number(ing.fiber_g),
    })),
  };
}

/** GET /api/recipes — no search/filter support server-side; returns the full list. */
export function listRecipes(): Promise<Recipe[]> {
  return apiFetch<RawRecipe[]>("/api/recipes").then((rows) => rows.map(toRecipe));
}

/** GET /api/recipes/:id — detail, with ingredients (5 joined nutrient columns only). */
export function getRecipe(id: number): Promise<RecipeDetail> {
  return apiFetch<RawRecipeDetail>(`/api/recipes/${id}`).then(toRecipeDetail);
}

/** POST /api/recipes — create a recipe and its ingredient list together.
 *  Response echoes the ingredients back as-sent (not re-joined with names/nutrients). */
export function createRecipe(input: CreateRecipeInput): Promise<CreatedRecipe> {
  return apiFetch<RawRecipe & { ingredients: RecipeIngredientInput[] }>("/api/recipes", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((raw) => ({ ...toRecipe(raw), ingredients: raw.ingredients }));
}

/** PATCH /api/recipes/:id — update recipe fields only (not the ingredient list). */
export function updateRecipe(id: number, updates: UpdateRecipeInput): Promise<Recipe> {
  return apiFetch<RawRecipe>(`/api/recipes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  }).then(toRecipe);
}

/** PUT /api/recipes/:id/ingredients — replace the full ingredient list.
 *  Response already returns plain numbers server-side (recipe_id via Number(), ingredients as-sent) — no coercion needed. */
export function replaceRecipeIngredients(
  id: number,
  ingredients: RecipeIngredientInput[],
): Promise<ReplaceRecipeIngredientsResult> {
  return apiFetch<ReplaceRecipeIngredientsResult>(`/api/recipes/${id}/ingredients`, {
    method: "PUT",
    body: JSON.stringify({ ingredients }),
  });
}

/** DELETE /api/recipes/:id */
export function deleteRecipe(id: number): Promise<void> {
  return apiFetch<void>(`/api/recipes/${id}`, { method: "DELETE" });
}
