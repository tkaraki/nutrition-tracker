import { useState, type FormEvent } from "react";
import { Button, Field } from "../ui";
import { useIngredients } from "../../hooks/useIngredients";
import { useCreateRecipe } from "../../hooks/useRecipes";
import { QuickAddIngredient } from "./QuickAddIngredient";
import type { CreatedRecipe, Ingredient } from "../../api/types";

interface QuickAddRecipeProps {
  onCreated: (recipe: CreatedRecipe) => void;
  onCancel: () => void;
}

interface IngredientLineValue {
  ingredientId: number | null;
  ingredientName: string;
  quantityG: string;
}

function emptyLine(): IngredientLineValue {
  return { ingredientId: null, ingredientName: "", quantityG: "" };
}

export function QuickAddRecipe({ onCreated, onCancel }: QuickAddRecipeProps) {
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState("1");
  const [lines, setLines] = useState<IngredientLineValue[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const createRecipe = useCreateRecipe();

  function updateLine(index: number, value: IngredientLineValue) {
    setLines((prev) => prev.map((line, i) => (i === index ? value : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const validLines = lines.filter((l) => l.ingredientId !== null && Number(l.quantityG) > 0);
  const canSubmit = title.trim() !== "" && validLines.length > 0 && !createRecipe.isPending;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    createRecipe.mutate(
      {
        title: title.trim(),
        servings: Number(servings) || 1,
        ingredients: validLines.map((l, i) => ({
          ingredient_id: l.ingredientId!,
          quantity_g: Number(l.quantityG),
          sort_order: i,
        })),
      },
      {
        onSuccess: (recipe) => onCreated(recipe),
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't create recipe"),
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        <Field
          label="Servings"
          type="number"
          min={0.25}
          step={0.25}
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className="sm:w-28"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)]">Ingredients</p>
        {lines.map((line, i) => (
          <IngredientLineRow
            key={i}
            value={line}
            onChange={(v) => updateLine(i, v)}
            onRemove={() => removeLine(i)}
            removable={lines.length > 1}
          />
        ))}
        <Button type="button" size="sm" variant="secondary" onClick={addLine}>
          + Add ingredient
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-[length:var(--text-caption)] text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={createRecipe.isPending} disabled={!canSubmit}>
          Create recipe
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface IngredientLineRowProps {
  value: IngredientLineValue;
  onChange: (value: IngredientLineValue) => void;
  onRemove: () => void;
  removable: boolean;
}

function IngredientLineRow({ value, onChange, onRemove, removable }: IngredientLineRowProps) {
  const [search, setSearch] = useState(value.ingredientName);
  const [showResults, setShowResults] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const { data: results, isPending } = useIngredients(search.trim() || undefined);

  function selectIngredient(ingredient: Ingredient) {
    setSearch(ingredient.name);
    setShowResults(false);
    onChange({ ...value, ingredientId: ingredient.id, ingredientName: ingredient.name });
  }

  function handleIngredientCreated(ingredient: Ingredient) {
    setShowCreateNew(false);
    selectIngredient(ingredient);
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <div className="flex items-start gap-2">
        <div className="relative min-w-0 flex-1">
          <Field
            label="Ingredient"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowResults(true);
              if (value.ingredientId !== null) {
                onChange({ ...value, ingredientId: null, ingredientName: "" });
              }
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search ingredients..."
            autoComplete="off"
          />
          {showResults && (
            <div className="relative z-10 mt-1 max-h-48 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
              {isPending && (
                <p className="px-3 py-2 text-[length:var(--text-caption)] text-[var(--color-text-subtle)]">
                  Searching...
                </p>
              )}
              {!isPending && results && results.length === 0 && (
                <p className="px-3 py-2 text-[length:var(--text-caption)] text-[var(--color-text-subtle)]">
                  No matches.
                </p>
              )}
              {!isPending &&
                results?.map((ingredient) => (
                  <button
                    key={ingredient.id}
                    type="button"
                    onClick={() => selectIngredient(ingredient)}
                    className="block w-full px-3 py-2 text-left text-[length:var(--text-body-sm)] hover:bg-[var(--color-surface-alt)]"
                  >
                    {ingredient.name}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => {
                  setShowResults(false);
                  setShowCreateNew(true);
                }}
                className="block w-full border-t border-[var(--color-border)] px-3 py-2 text-left text-[length:var(--text-caption)] font-medium text-[var(--color-primary)]"
              >
                Can't find it? Create new ingredient
              </button>
            </div>
          )}
        </div>
        <Field
          label="Grams"
          type="number"
          min={0}
          value={value.quantityG}
          onChange={(e) => onChange({ ...value, quantityG: e.target.value })}
          className="w-24"
        />
        {removable && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="mt-6"
            aria-label="Remove ingredient line"
          >
            Remove
          </Button>
        )}
      </div>

      {value.ingredientId !== null && (
        <p className="mt-1 text-[length:var(--text-caption)] text-[var(--color-success)]">Selected: {value.ingredientName}</p>
      )}

      {showCreateNew && (
        <div className="mt-2">
          <QuickAddIngredient onCreated={handleIngredientCreated} onCancel={() => setShowCreateNew(false)} />
        </div>
      )}
    </div>
  );
}
