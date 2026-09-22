import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../lib/errors.js";
import { validateQuery } from "../lib/validate.js";
import type { RequestWithUser } from "../middleware/requireAuth.js";
import { emptyTotals, NUTRIENT_KEYS, type NutrientKey } from "../lib/nutrients.js";

export const nutritionRouter = Router();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const dailyQuerySchema = z.object({ date: isoDate });
const rangeQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((q) => q.from <= q.to, { message: "from must be <= to" });

/**
 * Row shapes here mix two conventions on purpose: raw entity endpoints
 * (ingredients, recipes, ...) return NUMERIC/BIGINT as strings to avoid
 * precision loss on values that might round-trip back into a write. This
 * endpoint is read-only and derived — nothing here feeds back into
 * storage — and daily nutrient magnitudes (low thousands at most) are
 * nowhere near JS's safe-integer limit, so totals/targets/gaps are plain
 * numbers: more useful for a frontend to chart directly.
 */
type NutrientRow = Record<NutrientKey, number>;

function toNutrientRow(dbRow: Record<string, string> | undefined): NutrientRow {
  if (!dbRow) return emptyTotals();
  const row = emptyTotals();
  for (const key of NUTRIENT_KEYS) {
    row[key] = Number(dbRow[key] ?? 0);
  }
  return row;
}

async function fetchTargets(userId: number): Promise<Partial<NutrientRow>> {
  const result = await pool.query<{ nutrient_key: NutrientKey; daily_target: string }>(
    "SELECT nutrient_key, daily_target FROM nutrient_targets WHERE user_id = $1",
    [userId],
  );
  const targets: Partial<NutrientRow> = {};
  for (const row of result.rows) {
    targets[row.nutrient_key] = Number(row.daily_target);
  }
  return targets;
}

/** gap = target - consumed, only for nutrients that have a target set. */
function computeGaps(totals: NutrientRow, targets: Partial<NutrientRow>): Partial<NutrientRow> {
  const gaps: Partial<NutrientRow> = {};
  for (const key of NUTRIENT_KEYS) {
    const target = targets[key];
    if (target !== undefined) {
      gaps[key] = Math.round((target - totals[key]) * 100) / 100;
    }
  }
  return gaps;
}

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

    const [totalsResult, targets] = await Promise.all([
      pool.query(
        "SELECT * FROM daily_nutrient_totals WHERE user_id = $1 AND day BETWEEN $2 AND $3 ORDER BY day",
        [userId, from, to],
      ),
      fetchTargets(userId),
    ]);

    const byDate = new Map<string, Record<string, string>>();
    for (const row of totalsResult.rows) {
      byDate.set(row.day, row);
    }

    // Walk every calendar day in [from, to] via UTC-based date math, so the
    // list is correct regardless of the server's local timezone — the same
    // class of bug fixed for plan_date in src/db/pool.ts.
    const days: Array<{ date: string; totals: NutrientRow; gaps: Partial<NutrientRow> }> = [];
    const cursor = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    while (cursor <= end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const totals = toNutrientRow(byDate.get(dateStr));
      days.push({ date: dateStr, totals, gaps: computeGaps(totals, targets) });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Range summary: sum of actual intake vs. (daily target * number of
    // days) for each nutrient that has a target set.
    const summaryTotals = emptyTotals();
    for (const day of days) {
      for (const key of NUTRIENT_KEYS) summaryTotals[key] += day.totals[key];
    }
    const summaryGaps: Partial<NutrientRow> = {};
    for (const key of NUTRIENT_KEYS) {
      const target = targets[key];
      if (target !== undefined) {
        summaryGaps[key] = Math.round((target * days.length - summaryTotals[key]) * 100) / 100;
      }
    }

    res.json({ from, to, targets, days, summary: { totals: summaryTotals, gaps: summaryGaps } });
  }),
);
