/**
 * Fetches a recipe URL and gets it into a shape ready for extraction.
 * Prefers schema.org Recipe JSON-LD when the page has it — most recipe
 * sites embed this for Google's rich-result snippets, so title/servings/
 * instructions come back exactly as the site itself structured them, with
 * zero LLM calls. Falls back to a rough HTML-to-text strip, which then
 * goes through the same full-extraction LLM path as pasted text.
 */

interface JsonLdRecipe {
  "@type"?: unknown;
  name?: unknown;
  recipeYield?: unknown;
  recipeInstructions?: unknown;
  recipeIngredient?: unknown;
}

export interface FetchedRecipeSource {
  method: "json-ld" | "html-text";
  title?: string;
  servings?: number | null;
  instructions?: string | null;
  /** Only set when method === "json-ld" */
  ingredientLines?: string[];
  /** Only set when method === "html-text" */
  rawText?: string;
}

// Caps what gets sent to the LLM when falling back to raw page text — a
// full page (nav, comments, ads) can be huge, and none of that is worth
// spending tokens/latency on.
const MAX_HTML_TEXT_CHARS = 15_000;

export async function fetchRecipeFromUrl(url: string): Promise<FetchedRecipeSource> {
  let response: Response;
  try {
    response = await fetch(url, {
      // A generic browser-like UA — some sites block the default Node fetch UA outright.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; nutrition-tracker-recipe-import/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new Error(`Could not fetch ${url}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!response.ok) {
    throw new Error(`Could not fetch ${url} (HTTP ${response.status})`);
  }

  const html = await response.text();
  const recipe = extractRecipeJsonLd(html);

  if (recipe) {
    const ingredientLines = Array.isArray(recipe.recipeIngredient)
      ? recipe.recipeIngredient.filter((s): s is string => typeof s === "string")
      : [];
    return {
      method: "json-ld",
      title: typeof recipe.name === "string" ? recipe.name : undefined,
      servings: parseServings(recipe.recipeYield),
      instructions: normalizeInstructions(recipe.recipeInstructions),
      ingredientLines,
    };
  }

  return { method: "html-text", rawText: stripHtmlToText(html).slice(0, MAX_HTML_TEXT_CHARS) };
}

// ---------------------------------------------------------------------
// schema.org/Recipe JSON-LD parsing
// ---------------------------------------------------------------------

function isRecipeType(type: unknown): boolean {
  if (typeof type === "string") return type === "Recipe";
  if (Array.isArray(type)) return type.includes("Recipe");
  return false;
}

/** Recipe nodes can sit at the top level, inside an array, or nested under @graph. */
function findRecipeNode(node: unknown): JsonLdRecipe | undefined {
  if (node === null || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return undefined;
  }
  const obj = node as Record<string, unknown>;
  if (isRecipeType(obj["@type"])) return obj as JsonLdRecipe;
  if (Array.isArray(obj["@graph"])) return findRecipeNode(obj["@graph"]);
  return undefined;
}

function extractRecipeJsonLd(html: string): JsonLdRecipe | undefined {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const recipe = findRecipeNode(JSON.parse(raw));
      if (recipe) return recipe;
    } catch {
      continue; // malformed JSON-LD block on this page — try the next script tag
    }
  }
  return undefined;
}

/** recipeYield can be a number, a numeric string, "4 servings", an array, or a QuantitativeValue object. */
function parseServings(recipeYield: unknown): number | null {
  const candidate = Array.isArray(recipeYield) ? recipeYield[0] : recipeYield;
  if (typeof candidate === "number") return candidate;
  if (typeof candidate === "string") {
    const match = candidate.match(/\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  }
  if (candidate && typeof candidate === "object" && "value" in candidate) {
    return parseServings((candidate as { value: unknown }).value);
  }
  return null;
}

/** recipeInstructions can be a string, an array of strings, HowToStep objects, or nested HowToSection objects. */
function flattenInstructionStep(step: unknown): string | null {
  if (typeof step === "string") return step;
  if (step && typeof step === "object") {
    const obj = step as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (Array.isArray(obj.itemListElement)) {
      return obj.itemListElement
        .map(flattenInstructionStep)
        .filter((s): s is string => s !== null)
        .join("\n");
    }
  }
  return null;
}

function normalizeInstructions(recipeInstructions: unknown): string | null {
  if (typeof recipeInstructions === "string") return recipeInstructions;
  if (Array.isArray(recipeInstructions)) {
    const steps = recipeInstructions.map(flattenInstructionStep).filter((s): s is string => s !== null);
    return steps.length > 0 ? steps.join("\n") : null;
  }
  return null;
}

// ---------------------------------------------------------------------
// Fallback: rough HTML → text, for pages with no Recipe JSON-LD
// ---------------------------------------------------------------------

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
