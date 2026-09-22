import type { CoachContext } from "../coachContext.js";
import { buildCoachPrompt } from "./coachPrompt.js";
import { coachAdviceSchema, type CoachAdvice } from "./coachSchema.js";
import { buildFullExtractionPrompt, buildIngredientLinesPrompt } from "./prompt.js";
import type { CoachAdvisor, RecipeExtractor } from "./provider.js";
import { extractedIngredientSchema, extractedRecipeSchema, type ExtractedIngredient, type ExtractedRecipe } from "./schema.js";
import { generateJsonGemini } from "./transport.js";
import { z } from "zod";

const ingredientListSchema = z.array(extractedIngredientSchema);

export class GeminiProvider implements RecipeExtractor, CoachAdvisor {
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey and add it to .env.",
      );
    }
    this.apiKey = apiKey;
    // Overridable in case the default has moved on by the time this runs —
    // Google's Flash model naming has shifted before. If extraction starts
    // failing with a "model not found"-shaped error, check the current
    // name at https://ai.google.dev/gemini-api/docs/models and set
    // GEMINI_MODEL in .env.
    this.model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  }

  async extractRecipe(rawText: string): Promise<ExtractedRecipe> {
    const json = await generateJsonGemini({ apiKey: this.apiKey, model: this.model }, buildFullExtractionPrompt(rawText));
    return extractedRecipeSchema.parse(json);
  }

  async parseIngredientLines(lines: string[]): Promise<ExtractedIngredient[]> {
    const json = await generateJsonGemini({ apiKey: this.apiKey, model: this.model }, buildIngredientLinesPrompt(lines));
    return ingredientListSchema.parse(json);
  }

  async generateAdvice(context: CoachContext): Promise<CoachAdvice> {
    const json = await generateJsonGemini(
      { apiKey: this.apiKey, model: this.model },
      buildCoachPrompt(context),
      { temperature: 0.3 },
    );
    return coachAdviceSchema.parse(json);
  }
}
