import type { CoachContext } from "../coachContext.js";
import { buildCoachPrompt } from "./coachPrompt.js";
import { coachAdviceSchema, type CoachAdvice } from "./coachSchema.js";
import { buildFullExtractionPrompt, buildIngredientLinesPrompt } from "./prompt.js";
import type { CoachAdvisor, RecipeExtractor } from "./provider.js";
import { extractedIngredientSchema, extractedRecipeSchema, type ExtractedIngredient, type ExtractedRecipe } from "./schema.js";
import { generateJsonOllama } from "./transport.js";
import { z } from "zod";

const ingredientListSchema = z.array(extractedIngredientSchema);

export class OllamaProvider implements RecipeExtractor, CoachAdvisor {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    // No universally-right default — pick whatever model you've pulled
    // locally (`ollama pull <model>`) and set OLLAMA_MODEL in .env.
    this.model = process.env.OLLAMA_MODEL || "llama3.1";
  }

  async extractRecipe(rawText: string): Promise<ExtractedRecipe> {
    const json = await generateJsonOllama({ baseUrl: this.baseUrl, model: this.model }, buildFullExtractionPrompt(rawText));
    return extractedRecipeSchema.parse(json);
  }

  async parseIngredientLines(lines: string[]): Promise<ExtractedIngredient[]> {
    const json = await generateJsonOllama({ baseUrl: this.baseUrl, model: this.model }, buildIngredientLinesPrompt(lines));
    return ingredientListSchema.parse(json);
  }

  async generateAdvice(context: CoachContext): Promise<CoachAdvice> {
    const json = await generateJsonOllama(
      { baseUrl: this.baseUrl, model: this.model },
      buildCoachPrompt(context),
      { temperature: 0.3 },
    );
    return coachAdviceSchema.parse(json);
  }
}
