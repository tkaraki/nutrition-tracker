import { z } from "zod";

/**
 * What an LLM extracts as coaching advice from a user's nutrient history.
 * Validated with zod regardless of provider, because a provider's "JSON mode"
 * guarantees syntactically valid JSON — never that it matches this shape.
 *
 * `nutrient_keys` is deliberately `z.array(z.string())` rather than
 * `z.array(z.enum(NUTRIENT_KEYS))`: a single hallucinated or misspelled key
 * from the LLM would otherwise fail validation for the entire response and
 * discard genuinely useful recommendations. The consuming route is expected
 * to filter/normalize the keys against the real `NUTRIENT_KEYS` list after
 * parsing, rather than rejecting here.
 */
export const coachRecommendationSchema = z.object({
  title: z.string().min(1).max(200),
  detail: z.string().min(1).max(1200),
  nutrient_keys: z.array(z.string()).min(1),
  priority: z.enum(["high", "medium", "low"]),
});

export const coachAdviceSchema = z.object({
  summary: z.string().min(1).max(1200),
  recommendations: z.array(coachRecommendationSchema).min(1).max(5),
  doing_well: z.array(z.string().max(300)).max(3).default([]),
});

export type CoachAdvice = z.infer<typeof coachAdviceSchema>;
export type CoachRecommendation = z.infer<typeof coachRecommendationSchema>;
