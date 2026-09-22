import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { validateBody } from "../lib/validate.js";

export const ingredientsRouter = Router();

const nutrientFields = {
  calories_kcal: z.number().nonnegative().default(0),
  protein_g: z.number().nonnegative().default(0),
  carbs_g: z.number().nonnegative().default(0),
  fat_g: z.number().nonnegative().default(0),
  fiber_g: z.number().nonnegative().default(0),
  sodium_mg: z.number().nonnegative().default(0),
  potassium_mg: z.number().nonnegative().default(0),
  calcium_mg: z.number().nonnegative().default(0),
  iron_mg: z.number().nonnegative().default(0),
  vitamin_c_mg: z.number().nonnegative().default(0),
  vitamin_d_mcg: z.number().nonnegative().default(0),
};

const createIngredientSchema = z.object({
  name: z.string().trim().min(1),
  fdc_id: z.number().int().positive().optional(),
  serving_size_g: z.number().positive().optional(),
  extra_micros_json: z.record(z.string(), z.number()).default({}),
  ...nutrientFields,
});

// Every field optional for PATCH — partial update semantics.
const updateIngredientSchema = createIngredientSchema.partial();

const NUTRIENT_COLUMNS = [
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

const ALL_COLUMNS = ["name", "fdc_id", "serving_size_g", "extra_micros_json", ...NUTRIENT_COLUMNS] as const;

// GET /api/ingredients?search=chicken&limit=20&offset=0
ingredientsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const result = search
      ? await pool.query(
          `SELECT * FROM ingredients WHERE name ILIKE $1 ORDER BY name LIMIT $2 OFFSET $3`,
          [`%${search}%`, limit, offset],
        )
      : await pool.query(`SELECT * FROM ingredients ORDER BY name LIMIT $1 OFFSET $2`, [limit, offset]);

    res.json(result.rows);
  }),
);

ingredientsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await pool.query("SELECT * FROM ingredients WHERE id = $1", [req.params.id]);
    const row = result.rows[0];
    if (!row) throw AppError.notFound("Ingredient");
    res.json(row);
  }),
);

ingredientsRouter.post(
  "/",
  validateBody(createIngredientSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createIngredientSchema>;
    const columns = ALL_COLUMNS.filter((c) => body[c] !== undefined);
    const values = columns.map((c) => body[c]);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const result = await pool.query(
      `INSERT INTO ingredients (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      values,
    );
    res.status(201).json(result.rows[0]);
  }),
);

ingredientsRouter.patch(
  "/:id",
  validateBody(updateIngredientSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof updateIngredientSchema>;
    const columns = ALL_COLUMNS.filter((c) => body[c] !== undefined);
    if (columns.length === 0) {
      throw new AppError(400, "No fields to update");
    }
    const values = columns.map((c) => body[c]);
    const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(", ");

    const result = await pool.query(
      `UPDATE ingredients SET ${setClause}, updated_at = now() WHERE id = $${columns.length + 1} RETURNING *`,
      [...values, req.params.id],
    );
    const row = result.rows[0];
    if (!row) throw AppError.notFound("Ingredient");
    res.json(row);
  }),
);

ingredientsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await pool.query("DELETE FROM ingredients WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rowCount === 0) throw AppError.notFound("Ingredient");
    res.status(204).send();
  }),
);
