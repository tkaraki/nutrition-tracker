import type { CoachContext } from "../coachContext.js";

/**
 * Prompt for turning a CoachContext (already-computed nutrient/recipe/
 * supplement stats — see coachContext.ts) into coaching advice matching
 * coachAdviceSchema. Kept separate from prompt.ts: that file is for recipe
 * extraction, a completely different contract with its own shape/rules.
 */

const ADVICE_SHAPE = `{
  "summary": string,
  "recommendations": [{ "title": string, "detail": string, "nutrient_keys": string[], "priority": "high" | "medium" | "low" }],
  "doing_well": string[]
}`;

export function buildCoachPrompt(ctx: CoachContext): string {
  const nutrientLines = ctx.nutrients
    .map((n) => {
      return `- ${n.nutrient_key}: target ${n.target_per_day}/day, avg ${n.avg_per_day}/day (${n.pct_of_target}% of target), avg gap ${n.avg_gap_per_day}/day, met target ${n.days_met_target}/${ctx.day_count} days`;
    })
    .join("\n");
  const allowedKeys = ctx.nutrients.map((n) => n.nutrient_key).join(", ");

  const untargetedBlock =
    ctx.untargeted.length > 0
      ? `\n\nTracked but no target set (informational only — do not recommend against these):\n${ctx.untargeted
          .map((u) => `- ${u.nutrient_key}: avg ${u.avg_per_day}/day`)
          .join("\n")}`
      : "";

  const recipesBlock =
    ctx.top_recipes.length > 0
      ? `\n\nMost-eaten recipes this window:\n${ctx.top_recipes
          .map((r) => `- ${r.title} (${r.times_eaten}x)`)
          .join("\n")}`
      : "";

  const supplementsBlock =
    ctx.supplements.length > 0
      ? `\n\nSupplements taken:\n${ctx.supplements.map((s) => `- ${s.name} (${s.total_doses} doses)`).join("\n")}`
      : "";

  return `You are a personal nutrition coach. All figures below are already computed from the user's own logged food and supplement history — do not recompute or second-guess the numbers, just reason over them.

Window: ${ctx.from} to ${ctx.to}, ${ctx.day_count} days, ${ctx.days_logged} of those days have at least one logged item.

Per-nutrient stats (only nutrients the user has a target for):
${nutrientLines}${untargetedBlock}${recipesBlock}${supplementsBlock}

Produce advice as JSON matching this exact shape:
${ADVICE_SHAPE}

Rules:
- At most 5 recommendations, most-important-first.
- Each recommendation's "nutrient_keys" must be drawn ONLY from this exact list: ${allowedKeys}. Never invent a key that isn't in that list.
- Each "detail" must cite a concrete number from the data above (e.g. a target, avg/day, % of target, or gap) or name a specific recipe/supplement from the lists above — no generic advice.
- No medical claims, no diagnosis language, no supplement megadosing suggestions.
- If the data is too thin to say anything specific, say so plainly in "summary" rather than inventing detail.
- "doing_well" lists at most 3 short, specific positives (nutrients close to/at target, or good consistency); empty array if nothing stands out.
- Output ONLY the JSON object — no markdown code fences, no commentary before or after it.`;
}
