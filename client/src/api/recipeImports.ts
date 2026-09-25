import { apiFetch } from "./client";

/**
 * Wire types for POST /api/recipe-imports (src/routes/recipeImports.ts).
 * Numbers already come back as plain JS numbers here — the draft is never
 * persisted server-side, so there's no NUMERIC/BIGINT column round-trip to
 * coerce, unlike api/recipes.ts and api/ingredients.ts.
 */

export type RecipeImportInput = { source: "url"; url: string } | { source: "text"; text: string };

export interface DraftIngredientMatch {
  id: number;
  name: string;
  /** pg_trgm similarity, 0..1, already sorted desc by the API. */
  similarity: number;
}

export interface DraftIngredient {
  raw_text: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  matches: DraftIngredientMatch[];
}

export interface RecipeImportDraft {
  extraction_method: "llm" | "json-ld";
  source_url: string | null;
  title: string | null;
  servings: number | null;
  instructions: string | null;
  ingredients: DraftIngredient[];
}

/**
 * POST /api/recipe-imports — a real, ~10-30s LLM-backed call (or a fast
 * json-ld path for some URLs), never auto-fired. Nothing is written to the
 * database; the client resolves/creates ingredients and calls
 * POST /api/recipes itself (see RecipeImportRoute).
 *
 * Error handling is deliberately hands-off, same rationale as api/coach.ts:
 * `apiFetch` already throws `ApiError` with the backend's real
 * `.status`/`.message`; the UI branches on those. For reference, the
 * distinct failure modes (src/routes/recipeImports.ts,
 * src/middleware/llmRateLimit.ts):
 *   - 429 "Too many AI requests this minute — wait a bit and try again."
 *   - 429 "Daily AI request limit reached — the free Gemini quota resets at midnight Pacific."
 *   - 422 "Could not extract any readable content from that page" (URL mode only)
 *   - 502 the model didn't return usable JSON
 */
export function postRecipeImport(input: RecipeImportInput): Promise<RecipeImportDraft> {
  return apiFetch<RecipeImportDraft>("/api/recipe-imports", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
