import { z } from "zod";

/**
 * What an LLM (or the JSON-LD fast path) extracts from a recipe. Validated
 * with zod regardless of provider, because a provider's "JSON mode"
 * guarantees syntactically valid JSON — never that it matches this shape.
 */
export const extractedIngredientSchema = z.object({
  raw_text: z.string(),
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  note: z.string().nullable(),
});

export const extractedRecipeSchema = z.object({
  title: z.string(),
  servings: z.number().nullable(),
  instructions: z.string().nullable(),
  ingredients: z.array(extractedIngredientSchema),
});

export type ExtractedIngredient = z.infer<typeof extractedIngredientSchema>;
export type ExtractedRecipe = z.infer<typeof extractedRecipeSchema>;
