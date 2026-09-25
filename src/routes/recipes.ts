import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { validateBody } from "../lib/validate.js";
import type { RequestWithUser } from "../middleware/requireAuth.js";

export const recipesRouter = Router();

const recipeIngredientSchema = z.object({
  ingredient_id: z.number().int().positive(),
  quantity_g: z.number().positive(),
  note: z.string().trim().optional(),
  sort_order: z.number().int().default(0),
});

const createRecipeSchema = z.object({
  title: z.string().trim().min(1),
  instructions: z.string().optional(),
  source_url: z.string().url().optional(),
  servings: z.number().positive().default(1),
  ingredients: z.array(recipeIngredientSchema).default([]),
});

// `archived` is separate from the plain-field partial below: it maps to
// archived_at (true -> now(), false -> NULL), not a 1:1 column, so the
// PATCH handler treats it specially rather than through the generic
// column-list update the other fields use.
const updateRecipeSchema = createRecipeSchema
  .omit({ ingredients: true })
  .partial()
  .extend({ archived: z.boolean().optional() });

const replaceIngredientsSchema = z.object({
  ingredients: z.array(recipeIngredientSchema),
});

// GET /api/recipes?include_archived=true — list, scoped to the current
// user. Archived recipes are excluded by default (decision 4); they still
// resolve normally in meal-plan responses and totals, they're just hidden
// from the pick-a-recipe list.
recipesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const includeArchived = req.query.include_archived === "true";
    const result = await pool.query(
      includeArchived
        ? "SELECT * FROM recipes WHERE user_id = $1 ORDER BY created_at DESC"
        : "SELECT * FROM recipes WHERE user_id = $1 AND archived_at IS NULL ORDER BY created_at DESC",
      [userId],
    );
    res.json(result.rows);
  }),
);

// GET /api/recipes/:id — detail, with ingredients joined in
recipesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const recipeResult = await pool.query("SELECT * FROM recipes WHERE id = $1 AND user_id = $2", [
      req.params.id,
      userId,
    ]);
    const recipe = recipeResult.rows[0];
    if (!recipe) throw AppError.notFound("Recipe");

    const ingredientsResult = await pool.query(
      `SELECT ri.id, ri.quantity_g, ri.note, ri.sort_order,
              i.id AS ingredient_id, i.name, i.calories_kcal, i.protein_g,
              i.carbs_g, i.fat_g, i.fiber_g
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = $1
       ORDER BY ri.sort_order, ri.id`,
      [req.params.id],
    );

    res.json({ ...recipe, ingredients: ingredientsResult.rows });
  }),
);

// POST /api/recipes — create a recipe and its ingredient list together
recipesRouter.post(
  "/",
  validateBody(createRecipeSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof createRecipeSchema>;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const recipeResult = await client.query(
        `INSERT INTO recipes (user_id, title, instructions, source_url, servings)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, body.title, body.instructions ?? null, body.source_url ?? null, body.servings],
      );
      const recipe = recipeResult.rows[0];

      for (const ing of body.ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_g, note, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [recipe.id, ing.ingredient_id, ing.quantity_g, ing.note ?? null, ing.sort_order],
        );
      }

      await client.query("COMMIT");
      res.status(201).json({ ...recipe, ingredients: body.ingredients });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }),
);

// PATCH /api/recipes/:id — update recipe fields (not the ingredient list),
// and/or archive/unarchive. `archived: true` sets archived_at to now(),
// `archived: false` clears it back to active — same convention as `eaten`
// on meal_plan_recipes. This is also how a recipe archived by DELETE (see
// below) gets unarchived; PATCH has no archived_at filter on the WHERE, so
// it works on already-archived recipes too.
recipesRouter.patch(
  "/:id",
  validateBody(updateRecipeSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const { archived, ...fields } = req.body as z.infer<typeof updateRecipeSchema>;
    const columns = (Object.keys(fields) as Array<keyof typeof fields>).filter(
      (k) => fields[k] !== undefined,
    );
    if (columns.length === 0 && archived === undefined) {
      throw new AppError(400, "No fields to update");
    }
    const values = columns.map((c) => fields[c]);
    const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const archivedParam = columns.length + 1;

    const result = await pool.query(
      `UPDATE recipes
       SET ${setClause}${columns.length > 0 ? "," : ""}
           archived_at = CASE
             WHEN $${archivedParam}::boolean IS NULL THEN archived_at
             WHEN $${archivedParam}::boolean THEN now()
             ELSE NULL
           END,
           updated_at = now()
       WHERE id = $${archivedParam + 1} AND user_id = $${archivedParam + 2} RETURNING *`,
      [...values, archived ?? null, req.params.id, userId],
    );
    const row = result.rows[0];
    if (!row) throw AppError.notFound("Recipe");
    res.json(row);
  }),
);

// PUT /api/recipes/:id/ingredients — replace the full ingredient list.
// Whole-list replace rather than incremental add/remove endpoints, since
// that's what a recipe-edit form naturally submits.
recipesRouter.put(
  "/:id/ingredients",
  validateBody(replaceIngredientsSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof replaceIngredientsSchema>;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const owns = await client.query("SELECT id FROM recipes WHERE id = $1 AND user_id = $2", [
        req.params.id,
        userId,
      ]);
      if (owns.rowCount === 0) throw AppError.notFound("Recipe");

      await client.query("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [req.params.id]);
      for (const ing of body.ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_g, note, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.params.id, ing.ingredient_id, ing.quantity_g, ing.note ?? null, ing.sort_order],
        );
      }

      await client.query("COMMIT");
      res.json({ recipe_id: Number(req.params.id), ingredients: body.ingredients });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }),
);

// DELETE /api/recipes/:id — hard-delete when unused, archive when it's
// referenced by a logged/planned meal (decision 4). meal_plan_recipes.recipe_id
// has ON DELETE RESTRICT, so a plain DELETE there would otherwise surface as
// a raw 409 FK error with no way for the user to resolve it.
recipesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;

    const owns = await pool.query("SELECT id FROM recipes WHERE id = $1 AND user_id = $2", [
      req.params.id,
      userId,
    ]);
    if (owns.rowCount === 0) throw AppError.notFound("Recipe");

    const inUse = await pool.query("SELECT 1 FROM meal_plan_recipes WHERE recipe_id = $1 LIMIT 1", [
      req.params.id,
    ]);
    if ((inUse.rowCount ?? 0) > 0) {
      await pool.query("UPDATE recipes SET archived_at = now(), updated_at = now() WHERE id = $1", [
        req.params.id,
      ]);
      res.status(200).json({ archived: true });
      return;
    }

    await pool.query("DELETE FROM recipes WHERE id = $1", [req.params.id]);
    res.status(204).send();
  }),
);
