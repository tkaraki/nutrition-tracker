import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { NUTRIENT_KEYS } from "../lib/nutrients.js";
import { validateBody } from "../lib/validate.js";
import type { RequestWithUser } from "../middleware/requireAuth.js";

export const mealPlansRouter = Router();
export const mealPlanRecipesRouter = Router();
export const mealPlanIngredientsRouter = Router();

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

const createMealPlanSchema = z.object({
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  meal_type: z.enum(MEAL_TYPES),
});

const addRecipeSchema = z.object({
  recipe_id: z.number().int().positive(),
  servings: z.number().positive().default(1),
  eaten: z.boolean().default(false),
});

const addIngredientSchema = z.object({
  ingredient_id: z.number().int().positive(),
  quantity_g: z.number().positive(),
  eaten: z.boolean().default(false),
});

const updateMealPlanRecipeSchema = z.object({
  servings: z.number().positive().optional(),
  eaten: z.boolean().optional(),
});

const updateMealPlanIngredientSchema = z.object({
  quantity_g: z.number().positive().optional(),
  eaten: z.boolean().optional(),
});

// Nutrient amounts *for this row's quantity_g*, not the ingredient's raw
// per-100g values — i.<key> * mpi.quantity_g / 100, same math the
// food_direct view CTE uses. Lets the planner show per-row kcal/macros
// without a second lookup against /api/ingredients. Built from NUTRIENT_KEYS
// so it can't drift from the view or the ingredients/supplements columns.
const MEAL_PLAN_INGREDIENT_NUTRIENT_COLUMNS = NUTRIENT_KEYS.map(
  (key) => `i.${key} * mpi.quantity_g / 100 AS ${key}`,
).join(",\n         ");

const MEAL_PLAN_INGREDIENT_SELECT = `
  SELECT mpi.id, mpi.meal_plan_id, mpi.quantity_g, mpi.eaten_at,
         i.id AS ingredient_id, i.name,
         ${MEAL_PLAN_INGREDIENT_NUTRIENT_COLUMNS}
  FROM meal_plan_ingredients mpi
  JOIN ingredients i ON i.id = mpi.ingredient_id
`;

// GET /api/meal-plans?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns plan slots in range, each with its assigned recipes nested in.
mealPlansRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const from = typeof req.query.from === "string" ? req.query.from : "0001-01-01";
    const to = typeof req.query.to === "string" ? req.query.to : "9999-12-31";

    const plansResult = await pool.query(
      `SELECT * FROM meal_plans WHERE user_id = $1 AND plan_date BETWEEN $2 AND $3
       ORDER BY plan_date, meal_type`,
      [userId, from, to],
    );

    const planIds = plansResult.rows.map((p) => p.id);
    const recipesByPlan = new Map<number, unknown[]>();
    const ingredientsByPlan = new Map<number, unknown[]>();
    if (planIds.length > 0) {
      // Archived recipes still resolve here (decision 4): a recipe already
      // attached to a plan keeps showing up in responses and totals, only
      // adding a *new* archived recipe to a plan is blocked (see POST below).
      const [recipesResult, ingredientsResult] = await Promise.all([
        pool.query(
          `SELECT mpr.id, mpr.meal_plan_id, mpr.servings, mpr.eaten_at,
                  r.id AS recipe_id, r.title
           FROM meal_plan_recipes mpr
           JOIN recipes r ON r.id = mpr.recipe_id
           WHERE mpr.meal_plan_id = ANY($1::bigint[])
           ORDER BY mpr.id`,
          [planIds],
        ),
        pool.query(
          `${MEAL_PLAN_INGREDIENT_SELECT} WHERE mpi.meal_plan_id = ANY($1::bigint[]) ORDER BY mpi.id`,
          [planIds],
        ),
      ]);
      for (const row of recipesResult.rows) {
        const list = recipesByPlan.get(row.meal_plan_id) ?? [];
        list.push(row);
        recipesByPlan.set(row.meal_plan_id, list);
      }
      for (const row of ingredientsResult.rows) {
        const list = ingredientsByPlan.get(row.meal_plan_id) ?? [];
        list.push(row);
        ingredientsByPlan.set(row.meal_plan_id, list);
      }
    }

    res.json(
      plansResult.rows.map((p) => ({
        ...p,
        recipes: recipesByPlan.get(p.id) ?? [],
        ingredients: ingredientsByPlan.get(p.id) ?? [],
      })),
    );
  }),
);

// POST /api/meal-plans — get-or-create the (date, meal_type) slot.
// Upsert on the (user_id, plan_date, meal_type) unique constraint rather
// than erroring on a repeat call for the same day/meal.
mealPlansRouter.post(
  "/",
  validateBody(createMealPlanSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof createMealPlanSchema>;

    const result = await pool.query(
      `INSERT INTO meal_plans (user_id, plan_date, meal_type) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, plan_date, meal_type) DO UPDATE SET plan_date = EXCLUDED.plan_date
       RETURNING *`,
      [userId, body.plan_date, body.meal_type],
    );
    res.status(201).json(result.rows[0]);
  }),
);

mealPlansRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query("DELETE FROM meal_plans WHERE id = $1 AND user_id = $2 RETURNING id", [
      req.params.id,
      userId,
    ]);
    if (result.rowCount === 0) throw AppError.notFound("Meal plan");
    res.status(204).send();
  }),
);

// POST /api/meal-plans/:id/recipes — assign a recipe to a plan slot
mealPlansRouter.post(
  "/:id/recipes",
  validateBody(addRecipeSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof addRecipeSchema>;

    const owns = await pool.query("SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2", [
      req.params.id,
      userId,
    ]);
    if (owns.rowCount === 0) throw AppError.notFound("Meal plan");

    // Security: the recipe must belong to this user too, not just the plan.
    // Without this check, a user could attach another user's recipe_id and
    // read its title back through GET /api/meal-plans, with its nutrients
    // folded into their own totals (an IDOR). Archived recipes can't be
    // newly attached, though one already attached keeps resolving normally
    // (decision 4) — that's enforced by not filtering it out of GET/totals.
    const recipeOwns = await pool.query(
      "SELECT id FROM recipes WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
      [body.recipe_id, userId],
    );
    if (recipeOwns.rowCount === 0) throw AppError.notFound("Recipe");

    const result = await pool.query(
      `INSERT INTO meal_plan_recipes (meal_plan_id, recipe_id, servings, eaten_at)
       VALUES ($1, $2, $3, CASE WHEN $4 THEN now() ELSE NULL END) RETURNING *`,
      [req.params.id, body.recipe_id, body.servings, body.eaten],
    );
    res.status(201).json(result.rows[0]);
  }),
);

// POST /api/meal-plans/:id/ingredients — log an ingredient straight to a
// plan slot, without a recipe in between (see meal_plan_ingredients table
// comment). `eaten: true` is a shortcut for "I just ate this" in one call,
// same convention as the recipes endpoint above.
mealPlansRouter.post(
  "/:id/ingredients",
  validateBody(addIngredientSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof addIngredientSchema>;

    const owns = await pool.query("SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2", [
      req.params.id,
      userId,
    ]);
    if (owns.rowCount === 0) throw AppError.notFound("Meal plan");

    // Checked explicitly (rather than letting the FK fail) so a bad
    // ingredient_id reports as 404 "Ingredient", not a generic 409 FK error.
    const ingredientExists = await pool.query("SELECT id FROM ingredients WHERE id = $1", [
      body.ingredient_id,
    ]);
    if (ingredientExists.rowCount === 0) throw AppError.notFound("Ingredient");

    const inserted = await pool.query(
      `INSERT INTO meal_plan_ingredients (meal_plan_id, ingredient_id, quantity_g, eaten_at)
       VALUES ($1, $2, $3, CASE WHEN $4 THEN now() ELSE NULL END) RETURNING id`,
      [req.params.id, body.ingredient_id, body.quantity_g, body.eaten],
    );
    // Re-select through the nutrient-amount join so the response carries
    // name + per-row nutrients, same shape as GET /api/meal-plans.
    const result = await pool.query(`${MEAL_PLAN_INGREDIENT_SELECT} WHERE mpi.id = $1`, [
      inserted.rows[0].id,
    ]);
    res.status(201).json(result.rows[0]);
  }),
);

// PATCH /api/meal-plan-recipes/:id — adjust servings, and/or mark eaten.
// `eaten: true` stamps eaten_at with now(); `eaten: false` clears it back
// to planned-but-not-eaten. This is what distinguishes "planned" from
// "actually eaten" per the feature list.
mealPlanRecipesRouter.patch(
  "/:id",
  validateBody(updateMealPlanRecipeSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof updateMealPlanRecipeSchema>;
    if (body.servings === undefined && body.eaten === undefined) {
      throw new AppError(400, "No fields to update");
    }

    const result = await pool.query(
      `UPDATE meal_plan_recipes mpr
       SET servings = COALESCE($1, mpr.servings),
           eaten_at = CASE
             WHEN $2::boolean IS NULL THEN mpr.eaten_at
             WHEN $2::boolean THEN now()
             ELSE NULL
           END
       FROM meal_plans mp
       WHERE mpr.id = $3 AND mpr.meal_plan_id = mp.id AND mp.user_id = $4
       RETURNING mpr.*`,
      [body.servings ?? null, body.eaten ?? null, req.params.id, userId],
    );
    const row = result.rows[0];
    if (!row) throw AppError.notFound("Meal plan recipe");
    res.json(row);
  }),
);

mealPlanRecipesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query(
      `DELETE FROM meal_plan_recipes mpr USING meal_plans mp
       WHERE mpr.id = $1 AND mpr.meal_plan_id = mp.id AND mp.user_id = $2
       RETURNING mpr.id`,
      [req.params.id, userId],
    );
    if (result.rowCount === 0) throw AppError.notFound("Meal plan recipe");
    res.status(204).send();
  }),
);

// PATCH /api/meal-plan-ingredients/:id — adjust quantity_g, and/or mark
// eaten. Same eaten_at convention as meal_plan_recipes above.
mealPlanIngredientsRouter.patch(
  "/:id",
  validateBody(updateMealPlanIngredientSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof updateMealPlanIngredientSchema>;
    if (body.quantity_g === undefined && body.eaten === undefined) {
      throw new AppError(400, "No fields to update");
    }

    const updated = await pool.query(
      `UPDATE meal_plan_ingredients mpi
       SET quantity_g = COALESCE($1, mpi.quantity_g),
           eaten_at = CASE
             WHEN $2::boolean IS NULL THEN mpi.eaten_at
             WHEN $2::boolean THEN now()
             ELSE NULL
           END
       FROM meal_plans mp
       WHERE mpi.id = $3 AND mpi.meal_plan_id = mp.id AND mp.user_id = $4
       RETURNING mpi.id`,
      [body.quantity_g ?? null, body.eaten ?? null, req.params.id, userId],
    );
    const updatedRow = updated.rows[0];
    if (!updatedRow) throw AppError.notFound("Meal plan ingredient");

    const result = await pool.query(`${MEAL_PLAN_INGREDIENT_SELECT} WHERE mpi.id = $1`, [
      updatedRow.id,
    ]);
    res.json(result.rows[0]);
  }),
);

mealPlanIngredientsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query(
      `DELETE FROM meal_plan_ingredients mpi USING meal_plans mp
       WHERE mpi.id = $1 AND mpi.meal_plan_id = mp.id AND mp.user_id = $2
       RETURNING mpi.id`,
      [req.params.id, userId],
    );
    if (result.rowCount === 0) throw AppError.notFound("Meal plan ingredient");
    res.status(204).send();
  }),
);
