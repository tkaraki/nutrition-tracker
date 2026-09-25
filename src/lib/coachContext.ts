import { pool } from "../db/pool.js";
import { NUTRIENT_KEYS, type NutrientKey } from "./nutrients.js";
import { getNutritionRange } from "./nutritionRange.js";

export interface NutrientStat {
  nutrient_key: NutrientKey;
  target_per_day: number;
  avg_per_day: number;
  total: number;
  avg_gap_per_day: number;
  pct_of_target: number;
  days_met_target: number;
}

export interface CoachContext {
  from: string;
  to: string;
  day_count: number;
  days_logged: number;
  nutrients: NutrientStat[];
  untargeted: Array<{ nutrient_key: NutrientKey; avg_per_day: number }>;
  top_recipes: Array<{ title: string; times_eaten: number }>;
  supplements: Array<{ name: string; total_doses: number }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Assembles everything the coach prompt needs from a user's logged history in one shot. */
export async function buildCoachContext(userId: number, from: string, to: string): Promise<CoachContext> {
  const [range, recipesResult, supplementsResult] = await Promise.all([
    getNutritionRange(userId, from, to),
    // times_eaten cast to ::int: COUNT(*) already comes back as a JS-safe number
    // via pg's bigint parser as a string, but this endpoint is read-only/derived
    // (see nutritionRange.ts) so a plain number is more useful downstream.
    pool.query<{ title: string; times_eaten: number }>(
      `SELECT r.title, COUNT(*)::int AS times_eaten
       FROM meal_plan_recipes mpr
       JOIN meal_plans mp ON mp.id = mpr.meal_plan_id
       JOIN recipes r     ON r.id = mpr.recipe_id
       WHERE mp.user_id = $1 AND mpr.eaten_at IS NOT NULL AND mp.plan_date BETWEEN $2 AND $3
       GROUP BY r.title ORDER BY times_eaten DESC, r.title LIMIT 8`,
      [userId, from, to],
    ),
    // total_doses cast to ::float: SUM(sl.doses) is NUMERIC (string by pool.ts's
    // parser); same read-only/derived reasoning as above applies here.
    pool.query<{ name: string; total_doses: number }>(
      `SELECT s.name, SUM(sl.doses)::float AS total_doses
       FROM supplement_logs sl
       JOIN supplements s ON s.id = sl.supplement_id
       WHERE sl.user_id = $1 AND sl.log_date BETWEEN $2 AND $3
       GROUP BY s.name ORDER BY total_doses DESC LIMIT 8`,
      [userId, from, to],
    ),
  ]);

  const dayCount = range.days.length;
  const daysLogged = range.days.filter((d) => NUTRIENT_KEYS.some((k) => d.totals[k] > 0)).length;

  const nutrients: NutrientStat[] = [];
  for (const key of NUTRIENT_KEYS) {
    const target = range.targets[key];
    if (target === undefined) continue;
    const total = round2(range.summary.totals[key]);
    const avgPerDay = round2(dayCount > 0 ? total / dayCount : 0);
    const avgGapPerDay = round2(target - avgPerDay);
    const pctOfTarget = target === 0 ? 0 : Math.round((avgPerDay / target) * 100);
    const daysMetTarget = range.days.filter((d) => d.totals[key] >= target).length;
    nutrients.push({
      nutrient_key: key,
      target_per_day: target,
      avg_per_day: avgPerDay,
      total,
      avg_gap_per_day: avgGapPerDay,
      pct_of_target: pctOfTarget,
      days_met_target: daysMetTarget,
    });
  }
  nutrients.sort((a, b) => a.pct_of_target - b.pct_of_target);

  const untargeted: CoachContext["untargeted"] = [];
  for (const key of NUTRIENT_KEYS) {
    if (range.targets[key] !== undefined) continue;
    const avgPerDay = round2(dayCount > 0 ? range.summary.totals[key] / dayCount : 0);
    if (avgPerDay > 0) untargeted.push({ nutrient_key: key, avg_per_day: avgPerDay });
  }

  return {
    from,
    to,
    day_count: dayCount,
    days_logged: daysLogged,
    nutrients,
    untargeted,
    top_recipes: recipesResult.rows.map((r) => ({ title: r.title, times_eaten: r.times_eaten })),
    supplements: supplementsResult.rows.map((s) => ({ name: s.name, total_doses: s.total_doses })),
  };
}
