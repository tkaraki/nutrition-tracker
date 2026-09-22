import { Router } from "express";
import { z } from "zod";
import { buildCoachContext } from "../lib/coachContext.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { getCoachAdvisor, type CoachAdvice, type CoachRecommendation } from "../lib/llm/index.js";
import { NUTRIENT_KEYS } from "../lib/nutrients.js";
import { validateBody } from "../lib/validate.js";
import { llmDailyLimiter, llmMinuteLimiter } from "../middleware/llmRateLimit.js";
import type { RequestWithUser } from "../middleware/requireAuth.js";

export const coachRouter = Router();

// Wrapped in z.preprocess: express.json() leaves req.body as undefined for
// a POST with an empty/absent body, and validateBody calls schema.parse
// directly — an object schema (even with per-field defaults) still rejects
// a bare `undefined`. Substituting {} makes an absent body behave like
// "use all defaults", per the spec's optional request body.
const adviceRequestSchema = z.preprocess(
  (val) => val ?? {},
  z.object({
    days: z.number().int().min(1).max(30).default(7),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
);

// POST rather than GET: this triggers a real, non-cacheable, non-free
// upstream LLM call — same reasoning as recipeImports.ts using POST.
coachRouter.post(
  "/advice",
  llmMinuteLimiter,
  llmDailyLimiter,
  validateBody(adviceRequestSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof adviceRequestSchema>;

    const to = body.to ?? new Date().toISOString().slice(0, 10);
    // Same UTC date-arithmetic idiom used in nutritionRange.ts, so the
    // window is correct regardless of the server's local timezone.
    const fromDate = new Date(`${to}T00:00:00Z`);
    fromDate.setUTCDate(fromDate.getUTCDate() - (body.days - 1));
    const from = fromDate.toISOString().slice(0, 10);

    const context = await buildCoachContext(userId, from, to);

    if (context.nutrients.length === 0) {
      throw new AppError(
        422,
        "No nutrient targets set — set at least one via PUT /api/nutrient-targets/:nutrientKey before asking the coach.",
      );
    }

    // Checked before any LLM call: never spend an upstream call on a user
    // with nothing logged to reason about.
    if (context.days_logged === 0) {
      throw new AppError(422, `No food or supplement logs between ${from} and ${to} — log some meals or doses first.`);
    }

    let advice: CoachAdvice;
    try {
      advice = await getCoachAdvisor().generateAdvice(context);
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.error("Coach advisor failed", err);
      throw new AppError(502, "The coach model did not return usable advice — try again.");
    }

    // Ground the model's output: it occasionally invents or misspells a
    // nutrient key, and an ungrounded recommendation is exactly the kind of
    // generic, unverifiable advice this feature exists to avoid.
    const validKeys = new Set<string>(NUTRIENT_KEYS);
    const recommendations: CoachRecommendation[] = advice.recommendations
      .map((rec) => ({
        ...rec,
        // Set dedupes case/whitespace variants of the same key the model
        // might repeat (e.g. "Protein_g" and "protein_g").
        nutrient_keys: [...new Set(rec.nutrient_keys.map((k) => k.trim().toLowerCase()))].filter((k) =>
          validKeys.has(k),
        ),
      }))
      .filter((rec) => rec.nutrient_keys.length > 0);

    if (recommendations.length === 0) {
      throw new AppError(502, "The coach model did not return usable advice — try again.");
    }

    res.json({
      from,
      to,
      day_count: context.day_count,
      days_logged: context.days_logged,
      targets: Object.fromEntries(context.nutrients.map((n) => [n.nutrient_key, n.target_per_day])),
      nutrients: context.nutrients,
      advice: { summary: advice.summary, recommendations, doing_well: advice.doing_well },
      provider: process.env.LLM_PROVIDER || "gemini",
      generated_at: new Date().toISOString(),
    });
  }),
);
