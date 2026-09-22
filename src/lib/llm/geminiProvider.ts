import { buildFullExtractionPrompt, buildIngredientLinesPrompt } from "./prompt.js";
import type { RecipeExtractor } from "./provider.js";
import { extractedIngredientSchema, extractedRecipeSchema, type ExtractedIngredient, type ExtractedRecipe } from "./schema.js";
import { z } from "zod";

const ingredientListSchema = z.array(extractedIngredientSchema);

export class GeminiProvider implements RecipeExtractor {
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
    const json = await this.generateJson(buildFullExtractionPrompt(rawText));
    return extractedRecipeSchema.parse(json);
  }

  async parseIngredientLines(lines: string[]): Promise<ExtractedIngredient[]> {
    const json = await this.generateJson(buildIngredientLinesPrompt(lines));
    return ingredientListSchema.parse(json);
  }

  private async generateJson(prompt: string): Promise<unknown> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1, // extraction, not creative writing — keep it literal
          // Literal field-splitting needs no reasoning, and thinking tokens
          // push this well past the timeout below on models that think by
          // default (e.g. gemini-3.6-flash, unlike its 2.5 predecessor).
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${detail.slice(0, 500)}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      throw new Error("Gemini response had no text content — check the API response shape hasn't changed.");
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Gemini did not return valid JSON: ${text.slice(0, 200)}`);
    }
  }
}
