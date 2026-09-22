/**
 * Shared prompt text, used by every provider, so the extraction contract
 * (field names, splitting rules) can't drift between them — the whole
 * point of being able to compare providers is that they're asked the same
 * thing.
 */

const INGREDIENT_SHAPE = `{ "raw_text": string, "name": string, "quantity": number | null, "unit": string | null, "note": string | null }`;

const INGREDIENT_RULES = `- "raw_text" is the ingredient line exactly as written.
- "name" is just the ingredient itself, with no quantity/unit/prep notes (e.g. "flour", not "2 cups flour, sifted").
- "quantity" and "unit" are split out numerically where stated (e.g. 2 and "cup"); null if not stated or not confidently parseable — never guess a value.
- "note" captures prep/state like "diced", "sifted", "room temperature"; null if there isn't one.`;

/** Full extraction: unstructured recipe text (pasted, or a page with no JSON-LD) → title/servings/instructions/ingredients. */
export function buildFullExtractionPrompt(rawText: string): string {
  return `Extract a recipe from the following text into JSON matching this exact shape:
{
  "title": string,
  "servings": number | null,
  "instructions": string | null,
  "ingredients": [${INGREDIENT_SHAPE}]
}

Rules:
${INGREDIENT_RULES}
- "instructions" is the full method as one string, preserving step order; null if the text has no method/steps.
- "servings" is a plain number (e.g. 4), not a range or a string; null if not stated.
- Output ONLY the JSON object — no markdown code fences, no commentary before or after it.

Recipe text:
"""
${rawText}
"""`;
}

/**
 * Lighter-weight: the ingredient lines are already known (e.g. pulled
 * straight from a site's own structured data) — just split each one into
 * its parts. Much smaller and more reliable than a full extraction, since
 * the LLM doesn't have to find the ingredient list inside a whole page.
 */
export function buildIngredientLinesPrompt(lines: string[]): string {
  return `Split each of the following ingredient lines into JSON matching this exact shape:
[${INGREDIENT_SHAPE}, ...]

Rules:
${INGREDIENT_RULES}
- Output exactly one object per input line, in the same order.
- Output ONLY the JSON array — no markdown code fences, no commentary.

Ingredient lines:
${lines.map((line, i) => `${i + 1}. ${line}`).join("\n")}`;
}
