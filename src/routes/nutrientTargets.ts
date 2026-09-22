import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { validateBody } from "../lib/validate.js";
import type { RequestWithUser } from "../middleware/currentUser.js";
import { NUTRIENT_KEYS } from "../lib/nutrients.js";

export const nutrientTargetsRouter = Router();

const setTargetSchema = z.object({
  daily_target: z.number().nonnegative(),
});

const nutrientKeyParam = z.enum(NUTRIENT_KEYS);

// GET /api/nutrient-targets — every target the current user has set
nutrientTargetsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query(
      "SELECT nutrient_key, daily_target FROM nutrient_targets WHERE user_id = $1 ORDER BY nutrient_key",
      [userId],
    );
    res.json(result.rows);
  }),
);

// PUT /api/nutrient-targets/:nutrientKey — set (create or replace) one target.
// PUT rather than POST: nutrient_key is the resource's natural id, and
// "set this target to this value" is idempotent by nature.
nutrientTargetsRouter.put(
  "/:nutrientKey",
  validateBody(setTargetSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const nutrientKey = nutrientKeyParam.parse(req.params.nutrientKey);
    const body = req.body as z.infer<typeof setTargetSchema>;

    const result = await pool.query(
      `INSERT INTO nutrient_targets (user_id, nutrient_key, daily_target)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, nutrient_key)
       DO UPDATE SET daily_target = EXCLUDED.daily_target, updated_at = now()
       RETURNING nutrient_key, daily_target`,
      [userId, nutrientKey, body.daily_target],
    );
    res.json(result.rows[0]);
  }),
);

nutrientTargetsRouter.delete(
  "/:nutrientKey",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const nutrientKey = nutrientKeyParam.parse(req.params.nutrientKey);
    const result = await pool.query(
      "DELETE FROM nutrient_targets WHERE user_id = $1 AND nutrient_key = $2 RETURNING nutrient_key",
      [userId, nutrientKey],
    );
    if (result.rowCount === 0) throw AppError.notFound("Nutrient target");
    res.status(204).send();
  }),
);
