import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { fetchRecipeFromUrl } from "../lib/llm/fetchRecipePage.js";
import { LlmQuotaExhaustedError } from "../lib/llm/errors.js";
import { getRecipeExtractor } from "../lib/llm/index.js";
import type { ExtractedIngredient } from "../lib/llm/schema.js";
import { validateBody } from "../lib/validate.js";
import { llmDailyLimiter, llmMinuteLimiter } from "../middleware/llmRateLimit.js";

export const recipeImportsRouter = Router();

const importSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("text"), text: z.string().trim().min(1) }),
  z.object({ source: z.literal("url"), url: z.string().url() }),
]);

interface IngredientMatch {
  id: number;
  name: string;
  similarity: number;
}

interface DraftIngredient extends ExtractedIngredient {
  matches: IngredientMatch[];
}

// Suggests existing ingredients whose name resembles a freshly-parsed one,
// via pg_trgm similarity — not automatic, just narrowing the review step
// down to a short pick-list instead of a blind search of the whole table.
async function suggestMatches(name: string): Promise<IngredientMatch[]> {
  const result = await pool.query<IngredientMatch>(
    `SELECT id, name, similarity(name, $1) AS similarity
     FROM ingredients
     WHERE similarity(name, $1) > 0.2
     ORDER BY similarity DESC
     LIMIT 5`,
    [name],
  );
  return result.rows;
}

async function withMatches(ingredients: ExtractedIngredient[]): Promise<DraftIngredient[]> {
  return Promise.all(
    ingredients.map(async (ing) => ({ ...ing, matches: await suggestMatches(ing.name) })),
  );
}

// Every extractor call goes through this: previously a raw provider failure
// (bad JSON, timeout, network error, etc.) had no catch anywhere on this
// path and fell all the way through to the generic unhandled-error 500 in
// errors.ts — unlike coach.ts, which already mapped the equivalent failure
// to a 502. AppError and LlmQuotaExhaustedError are already the right,
// specific shape, so they pass through untouched.
async function callExtractor<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError || err instanceof LlmQuotaExhaustedError) throw err;
    console.error("Recipe extraction failed", err);
    throw new AppError(502, "The extraction model did not return a usable recipe — try again.");
  }
}

// POST /api/recipe-imports — parse a recipe from pasted text or a URL into
// a structured draft. Nothing is written to the database here: this
// mirrors the "parse → review/edit → confirm" pattern already used
// elsewhere (Tally's statement imports) rather than a new one invented for
// this endpoint. The client resolves quantity+unit to quantity_g and picks
// (or creates) real ingredient_ids, then calls POST /api/recipes itself —
// unit-to-gram conversion is deliberately not automated here; guessing a
// density wrong would silently corrupt nutrition data.
recipeImportsRouter.post(
  "/",
  llmMinuteLimiter,
  llmDailyLimiter,
  validateBody(importSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof importSchema>;
    const extractor = getRecipeExtractor();

    if (body.source === "text") {
      const extracted = await callExtractor(() => extractor.extractRecipe(body.text));
      res.json({
        extraction_method: "llm" as const,
        source_url: null,
        title: extracted.title,
        servings: extracted.servings,
        instructions: extracted.instructions,
        ingredients: await withMatches(extracted.ingredients),
      });
      return;
    }

    const fetched = await fetchRecipeFromUrl(body.url);

    if (fetched.method === "json-ld") {
      // Title/servings/instructions came straight off the site's own
      // structured data — reliable, no LLM call. Only the ingredient
      // lines (already isolated, so a small/cheap call) go through the LLM.
      const ingredients =
        fetched.ingredientLines && fetched.ingredientLines.length > 0
          ? await callExtractor(() => extractor.parseIngredientLines(fetched.ingredientLines!))
          : [];
      res.json({
        extraction_method: "json-ld" as const,
        source_url: body.url,
        title: fetched.title ?? null,
        servings: fetched.servings ?? null,
        instructions: fetched.instructions ?? null,
        ingredients: await withMatches(ingredients),
      });
      return;
    }

    if (!fetched.rawText) {
      throw new AppError(422, "Could not extract any readable content from that page");
    }
    const extracted = await callExtractor(() => extractor.extractRecipe(fetched.rawText!));
    res.json({
      extraction_method: "llm" as const,
      source_url: body.url,
      title: extracted.title,
      servings: extracted.servings,
      instructions: extracted.instructions,
      ingredients: await withMatches(extracted.ingredients),
    });
  }),
);
