import type { NutrientKey } from "../lib/nutrients";

/**
 * Hand-written wire types for the shapes the frontend actually works with —
 * i.e. AFTER each api/*.ts file's string->number coercion (see the module
 * doc comments in each api file for which fields the backend sends as
 * strings on read). Shaped directly from the route handlers in src/routes/.
 */

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------

export interface User {
  id: number;
  email: string;
  display_name: string;
}

export interface Me {
  user: User | null;
}

// ---------------------------------------------------------------------
// Nutrition (src/routes/nutrition.ts, src/lib/nutritionRange.ts)
// Already plain numbers on the wire — no coercion needed/applied.
// ---------------------------------------------------------------------

export type NutrientTotals = Record<NutrientKey, number>;
export type NutrientTargets = Partial<Record<NutrientKey, number>>;
export type NutrientGaps = Partial<Record<NutrientKey, number>>;

export interface DailyNutrition {
  date: string;
  totals: NutrientTotals;
  targets: NutrientTargets;
  gaps: NutrientGaps;
}

export interface DayTotals {
  date: string;
  totals: NutrientTotals;
  gaps: NutrientGaps;
}

export interface NutritionRange {
  from: string;
  to: string;
  targets: NutrientTargets;
  days: DayTotals[];
  summary: { totals: NutrientTotals; gaps: NutrientGaps };
}

// ---------------------------------------------------------------------
// Meal plans (src/routes/mealPlans.ts)
// ---------------------------------------------------------------------

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/** A recipe assigned to a meal plan slot — the shape nested in GET /api/meal-plans,
 *  and returned directly by POST /:id/recipes and PATCH /api/meal-plan-recipes/:id. */
export interface MealPlanRecipe {
  id: number;
  meal_plan_id: number;
  recipe_id: number;
  servings: number;
  /** null while planned-but-not-eaten; an ISO timestamp once marked eaten. */
  eaten_at: string | null;
  /** Only present on the nested shape returned by GET /api/meal-plans (joined in). */
  title?: string;
}

/** An ingredient logged directly to a meal plan slot, without a recipe in
 *  between — the shape nested in GET /api/meal-plans, and returned directly
 *  by POST /:id/ingredients and PATCH /api/meal-plan-ingredients/:id.
 *  Nutrient fields are already scaled for `quantity_g` (i.e. per-row
 *  amounts, not the ingredient's raw per-100g values) so the row can show
 *  kcal without a second lookup. */
export interface MealPlanIngredient extends NutrientTotals {
  id: number;
  meal_plan_id: number;
  ingredient_id: number;
  quantity_g: number;
  /** null while planned-but-not-eaten; an ISO timestamp once marked eaten. */
  eaten_at: string | null;
  name: string;
}

export interface MealPlan {
  id: number;
  user_id: number;
  plan_date: string;
  meal_type: MealType;
  created_at: string;
  recipes: MealPlanRecipe[];
  ingredients: MealPlanIngredient[];
}

// ---------------------------------------------------------------------
// Recipes (src/routes/recipes.ts)
// ---------------------------------------------------------------------

export interface Recipe {
  id: number;
  user_id: number;
  title: string;
  instructions: string | null;
  source_url: string | null;
  servings: number;
  created_at: string;
  updated_at: string;
}

/** A joined ingredient line as returned inside GET /api/recipes/:id — only
 *  the 5 nutrient columns the route actually joins in, not the full 11. */
export interface RecipeIngredientDetail {
  id: number;
  quantity_g: number;
  note: string | null;
  sort_order: number;
  ingredient_id: number;
  name: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface RecipeDetail extends Recipe {
  ingredients: RecipeIngredientDetail[];
}

export interface RecipeIngredientInput {
  ingredient_id: number;
  quantity_g: number;
  note?: string;
  sort_order?: number;
}

export interface CreateRecipeInput {
  title: string;
  instructions?: string;
  source_url?: string;
  servings?: number;
  ingredients?: RecipeIngredientInput[];
}

/** POST /api/recipes response — echoes back the input ingredient list as-sent (not joined). */
export interface CreatedRecipe extends Recipe {
  ingredients: RecipeIngredientInput[];
}

export interface UpdateRecipeInput {
  title?: string;
  instructions?: string;
  source_url?: string;
  servings?: number;
}

export interface ReplaceRecipeIngredientsResult {
  recipe_id: number;
  ingredients: RecipeIngredientInput[];
}

// ---------------------------------------------------------------------
// Ingredients (src/routes/ingredients.ts)
// ---------------------------------------------------------------------

export interface Ingredient {
  id: number;
  name: string;
  fdc_id: number | null;
  serving_size_g: number | null;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  extra_micros_json: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export type CreateIngredientInput = {
  name: string;
  fdc_id?: number;
  serving_size_g?: number;
  extra_micros_json?: Record<string, number>;
} & Partial<Record<NutrientKey, number>>;

// ---------------------------------------------------------------------
// Coach (src/routes/coach.ts)
// ---------------------------------------------------------------------

export interface CoachNutrientStat {
  nutrient_key: NutrientKey;
  target_per_day: number;
  avg_per_day: number;
  total: number;
  avg_gap_per_day: number;
  pct_of_target: number;
  days_met_target: number;
}

export interface CoachRecommendation {
  title: string;
  detail: string;
  nutrient_keys: string[];
  priority: "high" | "medium" | "low";
}

export interface CoachAdviceResponse {
  from: string;
  to: string;
  day_count: number;
  days_logged: number;
  targets: NutrientTargets;
  nutrients: CoachNutrientStat[];
  advice: {
    summary: string;
    recommendations: CoachRecommendation[];
    doing_well: string[];
  };
  provider: string;
  generated_at: string;
}
