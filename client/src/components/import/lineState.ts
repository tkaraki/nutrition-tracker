import type { DraftIngredient } from "../../api/recipeImports";

export type ResolutionMode = "match" | "search" | "create";

/**
 * Client-side review state for one ingredient line. `draft` is the raw
 * extraction from the API (empty/blank for manually-added lines, see
 * `makeBlankLine`); everything else is what the user has done with it so
 * far. Kept as one flat object (rather than nested per-mode state) so
 * switching modes doesn't require reconciling multiple sub-states.
 */
export interface IngredientLine {
  /** Stable React key. Draft lines use their array index; manually-added
   *  lines get a counter-based id so they never collide with draft indexes. */
  key: string;
  draft: DraftIngredient;
  /** Only true for lines added via "+ Add ingredient line" — those can be
   *  removed outright; extracted lines can only be skipped. */
  manuallyAdded: boolean;
  /** Explicit "don't include this in the recipe" escape hatch — lets Save
   *  proceed without forcing a resolution on every extracted line. */
  skipped: boolean;
  mode: ResolutionMode | null;
  selectedMatchId: number | null;
  /** Set once a "search" pick or a "create new" submission resolves to a
   *  real ingredient id. */
  resolved: { id: number; name: string } | null;
  grams: string;
}

const GRAM_UNITS = new Set(["g", "gram", "grams"]);

/** Only pre-fills when the source unit is unambiguously grams — the server
 *  intentionally never converts cups/lb/tsp/etc., and neither does this UI. */
function prefillGrams(draft: DraftIngredient): string {
  if (draft.quantity != null && draft.unit && GRAM_UNITS.has(draft.unit.trim().toLowerCase())) {
    return String(draft.quantity);
  }
  return "";
}

export function makeLineFromDraft(draft: DraftIngredient, key: string): IngredientLine {
  const top = draft.matches[0];
  const autoSelectTop = top !== undefined && top.similarity > 0.5;
  return {
    key,
    draft,
    manuallyAdded: false,
    skipped: false,
    mode: autoSelectTop ? "match" : null,
    selectedMatchId: autoSelectTop ? top.id : null,
    resolved: null,
    grams: prefillGrams(draft),
  };
}

export function makeBlankLine(key: string): IngredientLine {
  return {
    key,
    draft: { raw_text: "", name: "", quantity: null, unit: null, note: null, matches: [] },
    manuallyAdded: true,
    skipped: false,
    mode: null,
    selectedMatchId: null,
    resolved: null,
    grams: "",
  };
}

export function resolvedIngredientId(line: IngredientLine): number | null {
  if (line.mode === "match") return line.selectedMatchId;
  if (line.mode === "search" || line.mode === "create") return line.resolved?.id ?? null;
  return null;
}

/** Gate for the "Save recipe" button and the per-block "Needs review" marker. */
export function isLineReady(line: IngredientLine): boolean {
  if (line.skipped) return true;
  return resolvedIngredientId(line) !== null && Number(line.grams) > 0;
}
