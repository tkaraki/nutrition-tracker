import { GeminiProvider } from "./geminiProvider.js";
import { OllamaProvider } from "./ollamaProvider.js";
import type { CoachAdvisor, RecipeExtractor } from "./provider.js";

export type { ExtractedIngredient, ExtractedRecipe } from "./schema.js";
export type { RecipeExtractor } from "./provider.js";
export type { CoachAdvisor } from "./provider.js";
export type { CoachAdvice, CoachRecommendation } from "./coachSchema.js";

/**
 * Provider chosen via LLM_PROVIDER=gemini|ollama in .env — deliberately a
 * runtime switch, not a compile-time choice, so the two can be compared
 * directly on the same input without a code change.
 */
function createProvider(): GeminiProvider | OllamaProvider {
  const provider = process.env.LLM_PROVIDER || "gemini";
  if (provider === "gemini") return new GeminiProvider();
  if (provider === "ollama") return new OllamaProvider();
  throw new Error(`Unknown LLM_PROVIDER "${provider}" — expected "gemini" or "ollama".`);
}

export function getRecipeExtractor(): RecipeExtractor {
  return createProvider();
}

export function getCoachAdvisor(): CoachAdvisor {
  return createProvider();
}
