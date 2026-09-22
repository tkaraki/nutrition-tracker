import { buildFullExtractionPrompt, buildIngredientLinesPrompt } from "./prompt.js";
import type { RecipeExtractor } from "./provider.js";
import { extractedIngredientSchema, extractedRecipeSchema, type ExtractedIngredient, type ExtractedRecipe } from "./schema.js";
import { z } from "zod";

const ingredientListSchema = z.array(extractedIngredientSchema);

export class OllamaProvider implements RecipeExtractor {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    // No universally-right default — pick whatever model you've pulled
    // locally (`ollama pull <model>`) and set OLLAMA_MODEL in .env.
    this.model = process.env.OLLAMA_MODEL || "llama3.1";
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
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, prompt, format: "json", stream: false }),
        signal: AbortSignal.timeout(60_000), // local models can be slow, especially on first load
      });
    } catch (err) {
      throw new Error(
        `Could not reach Ollama at ${this.baseUrl}. Is it running? (\`ollama serve\`, and \`ollama pull ${this.model}\` if you haven't) — ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama error (${response.status}): ${detail.slice(0, 500)}`);
    }

    const data = (await response.json()) as { response?: string };
    if (typeof data.response !== "string") {
      throw new Error("Ollama response had no text content — check the API response shape hasn't changed.");
    }

    try {
      return JSON.parse(data.response);
    } catch {
      throw new Error(`Ollama did not return valid JSON: ${data.response.slice(0, 200)}`);
    }
  }
}
