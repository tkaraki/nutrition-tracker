import type { ExtractedIngredient, ExtractedRecipe } from "./schema.js";

/**
 * The interface both providers implement, so LLM_PROVIDER can swap between
 * them freely — the point being to actually compare extraction quality
 * between a hosted and a local model, per the original design plan,
 * rather than commit to one sight unseen.
 */
export interface RecipeExtractor {
  /** Full extraction from unstructured text. */
  extractRecipe(rawText: string): Promise<ExtractedRecipe>;
  /** Structure already-isolated ingredient lines (e.g. from a site's JSON-LD). */
  parseIngredientLines(lines: string[]): Promise<ExtractedIngredient[]>;
}
