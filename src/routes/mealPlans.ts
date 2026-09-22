import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { validateBody } from "../lib/validate.js";
import type { RequestWithUser } from "../middleware/requireAuth.js";

export const mealPlansRouter = Router();
export const mealPlanRecipesRouter = Router();

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

const createMealPlanSchema = z.object({
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  meal_type: z.enum(MEAL_TYPES),
});

const addRecipeSchema = z.object({
  recipe_id: z.number().int().positive(),
  servings: z.number().positive().default(1),
});

const updateMealPlanRecipeSchema = z.object({
  servings: z.number().positive().optional(),
  eaten: z.boolean().optional(),
});

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
    if (planIds.length > 0) {
      const recipesResult = await pool.query(
        `SELECT mpr.id, mpr.meal_plan_id, mpr.servings, mpr.eaten_at,
                r.id AS recipe_id, r.title
         FROM meal_plan_recipes mpr
         JOIN recipes r ON r.id = mpr.recipe_id
         WHERE mpr.meal_plan_id = ANY($1::bigint[])
         ORDER BY mpr.id`,
        [planIds],
      );
      for (const row of recipesResult.rows) {
        const list = recipesByPlan.get(row.meal_plan_id) ?? [];
        list.push(row);
        recipesByPlan.set(row.meal_plan_id, list);
      }
    }

    res.json(plansResult.rows.map((p) => ({ ...p, recipes: recipesByPlan.get(p.id) ?? [] })));
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

    const result = await pool.query(
      `INSERT INTO meal_plan_recipes (meal_plan_id, recipe_id, servings) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, body.recipe_id, body.servings],
    );
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
