import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { validateBody } from "../lib/validate.js";
import type { RequestWithUser } from "../middleware/currentUser.js";

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

const updateRecipeSchema = createRecipeSchema
  .omit({ ingredients: true })
  .partial();

const replaceIngredientsSchema = z.object({
  ingredients: z.array(recipeIngredientSchema),
});

// GET /api/recipes — list, scoped to the current user
recipesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query(
      "SELECT * FROM recipes WHERE user_id = $1 ORDER BY created_at DESC",
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

// PATCH /api/recipes/:id — update recipe fields only (not the ingredient list)
recipesRouter.patch(
  "/:id",
  validateBody(updateRecipeSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof updateRecipeSchema>;
    const columns = (Object.keys(body) as Array<keyof typeof body>).filter((k) => body[k] !== undefined);
    if (columns.length === 0) {
      throw new AppError(400, "No fields to update");
    }
    const values = columns.map((c) => body[c]);
    const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(", ");

    const result = await pool.query(
      `UPDATE recipes SET ${setClause}, updated_at = now()
       WHERE id = $${columns.length + 1} AND user_id = $${columns.length + 2} RETURNING *`,
      [...values, req.params.id, userId],
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

recipesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query("DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING id", [
      req.params.id,
      userId,
    ]);
    if (result.rowCount === 0) throw AppError.notFound("Recipe");
    res.status(204).send();
  }),
);
