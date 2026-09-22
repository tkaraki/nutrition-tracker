import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../lib/errors.js";
import { computeGaps, fetchTargets, getNutritionRange, toNutrientRow } from "../lib/nutritionRange.js";
import { validateQuery } from "../lib/validate.js";
import type { RequestWithUser } from "../middleware/requireAuth.js";

export const nutritionRouter = Router();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const dailyQuerySchema = z.object({ date: isoDate });
const rangeQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((q) => q.from <= q.to, { message: "from must be <= to" });

// GET /api/nutrition/daily?date=YYYY-MM-DD
nutritionRouter.get(
  "/daily",
  validateQuery(dailyQuerySchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const { date } = (req as unknown as { validatedQuery: z.infer<typeof dailyQuerySchema> }).validatedQuery;

    const [totalsResult, targets] = await Promise.all([
      pool.query("SELECT * FROM daily_nutrient_totals WHERE user_id = $1 AND day = $2", [userId, date]),
      fetchTargets(userId),
    ]);

    const totals = toNutrientRow(totalsResult.rows[0]);
    res.json({ date, totals, targets, gaps: computeGaps(totals, targets) });
  }),
);

// GET /api/nutrition/range?from=YYYY-MM-DD&to=YYYY-MM-DD
// The building block for a "weekly" view: pass a 7-day window.
nutritionRouter.get(
  "/range",
  validateQuery(rangeQuerySchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const { from, to } = (req as unknown as { validatedQuery: z.infer<typeof rangeQuerySchema> }).validatedQuery;

    res.json(await getNutritionRange(userId, from, to));
  }),
);
