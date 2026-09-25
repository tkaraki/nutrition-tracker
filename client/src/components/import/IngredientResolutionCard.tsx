import { useState } from "react";
import { Badge, Combobox, Field } from "../ui";
import { QuickAddIngredient } from "../planner/QuickAddIngredient";
import { useIngredients } from "../../hooks/useIngredients";
import type { Ingredient } from "../../api/types";
import { isLineReady, type IngredientLine } from "./lineState";

interface IngredientResolutionCardProps {
  line: IngredientLine;
  onChange: (next: IngredientLine) => void;
  onRemove?: () => void;
}

/**
 * One draft ingredient's resolution block: raw text as a `<fieldset>`/
 * `<legend>` pair (so the raw-text-to-resolved-fields relationship is
 * programmatically clear per the a11y note), a radio list of pg_trgm
 * matches, a Combobox fallback search, an inline "create new" escape
 * hatch (reusing the existing `QuickAddIngredient`), and an always-visible
 * grams field. Never auto-converts a non-gram unit — see lineState.ts.
 */
export function IngredientResolutionCard({ line, onChange, onRemove }: IngredientResolutionCardProps) {
  // Unconditional hook call (rules of hooks — this card only ever shows the
  // Combobox in "search" mode, but the query itself is cheap to keep mounted
  // and shares its cache entry with every other line at the same query text,
  // same pattern as QuickAddRecipe's IngredientLineRow).
  const [searchQuery, setSearchQuery] = useState("");
  const {
    data: searchResults,
    isLoading: searchLoading,
    isError: searchError,
  } = useIngredients(searchQuery.trim() || undefined);

  const ready = isLineReady(line);
  const needsReview = !line.skipped && !ready;
  const groupName = `resolution-${line.key}`;
  const gramsHint =
    line.grams.trim() === "" && line.draft.quantity != null
      ? `Original: ${line.draft.quantity}${line.draft.unit ? ` ${line.draft.unit}` : ""} ${line.draft.name} — enter the equivalent in grams.`
      : undefined;

  return (
    <fieldset
      className={`rounded-[var(--radius-md)] border bg-[var(--color-surface)] p-4 ${
        needsReview
          ? "border-l-4 border-l-[var(--color-warning)] border-y-[var(--color-border)] border-r-[var(--color-border)]"
          : "border-[var(--color-border)]"
      }`}
    >
      <legend className="flex flex-wrap items-center gap-2 px-1 text-[length:var(--text-caption)] text-[var(--color-text-subtle)]">
        <span>{line.draft.raw_text || "(manually added)"}</span>
        {needsReview && <Badge variant="warning">Needs review</Badge>}
        {line.skipped && <Badge variant="neutral">Skipped</Badge>}
      </legend>

      <label className="mt-2 flex items-center gap-2 text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={line.skipped}
          onChange={(e) => onChange({ ...line, skipped: e.target.checked })}
        />
        Skip this line (don't include it in the recipe)
      </label>

      {!line.skipped && (
        <>
          <div className="mt-3 space-y-2">
            {line.draft.matches.map((match) => (
              <label key={match.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={groupName}
                  className="h-4 w-4"
                  checked={line.mode === "match" && line.selectedMatchId === match.id}
                  onChange={() => onChange({ ...line, mode: "match", selectedMatchId: match.id })}
                />
                <span className="text-[length:var(--text-body-sm)] text-[var(--color-text)]">{match.name}</span>
                <Badge variant="neutral">{Math.round(match.similarity * 100)}% match</Badge>
              </label>
            ))}

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={groupName}
                className="h-4 w-4"
                checked={line.mode === "search"}
                onChange={() => onChange({ ...line, mode: "search" })}
              />
              <span className="text-[length:var(--text-body-sm)] text-[var(--color-text)]">
                Search for a different ingredient
              </span>
            </label>
            {line.mode === "search" && (
              <div className="mt-2 pl-6 border-l-2 border-[var(--color-border)]">
                <Combobox<Ingredient>
                  label="Ingredient"
                  placeholder="Search ingredients..."
                  value={line.resolved?.name ?? searchQuery}
                  onSearch={setSearchQuery}
                  onSelect={(ingredient) =>
                    onChange({ ...line, resolved: { id: ingredient.id, name: ingredient.name } })
                  }
                  onClear={() => onChange({ ...line, resolved: null })}
                  items={searchResults ?? []}
                  isLoading={searchLoading}
                  isError={searchError}
                  getKey={(i) => i.id}
                  getLabel={(i) => i.name}
                  isSelected={line.resolved !== null}
                />
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={groupName}
                className="h-4 w-4"
                checked={line.mode === "create"}
                onChange={() => onChange({ ...line, mode: "create" })}
              />
              <span className="text-[length:var(--text-body-sm)] text-[var(--color-text)]">
                + Create new ingredient
              </span>
            </label>
            {line.mode === "create" && (
              <div className="mt-2 pl-6 border-l-2 border-[var(--color-border)]">
                {line.resolved ? (
                  <p className="text-[length:var(--text-caption)] text-[var(--color-success)]">
                    Created: {line.resolved.name}
                  </p>
                ) : (
                  <QuickAddIngredient
                    onCreated={(ingredient) =>
                      onChange({ ...line, resolved: { id: ingredient.id, name: ingredient.name } })
                    }
                    onCancel={() => onChange({ ...line, mode: null })}
                  />
                )}
              </div>
            )}
          </div>

          <div className="mt-3 max-w-40">
            <Field
              label="Grams"
              type="number"
              min={0}
              value={line.grams}
              onChange={(e) => onChange({ ...line, grams: e.target.value })}
              hint={gramsHint}
            />
          </div>
        </>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-3 text-[length:var(--text-caption)] font-medium text-[var(--color-text-muted)] underline"
        >
          Remove line
        </button>
      )}
    </fieldset>
  );
}
