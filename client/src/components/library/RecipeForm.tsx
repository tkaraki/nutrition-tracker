import { useState, type FormEvent } from "react";
import { Button, Field, Textarea } from "../ui";
import { useCreateRecipe, useReplaceRecipeIngredients, useUpdateRecipe } from "../../hooks/useRecipes";
import { IngredientCombobox } from "./IngredientCombobox";
import type { CreatedRecipe, Recipe, RecipeDetail } from "../../api/types";

interface RecipeFormProps {
  mode: "create" | "edit";
  /** Required (and pre-fills the form) in edit mode; ignored in create mode. */
  initial?: RecipeDetail;
  onSaved: (recipe: Recipe | CreatedRecipe) => void;
  onCancel: () => void;
}

interface IngredientLineValue {
  key: string;
  ingredientId: number | null;
  ingredientName: string;
  quantityG: string;
  note?: string;
}

let lineKeySeq = 0;
function newLineKey(): string {
  lineKeySeq += 1;
  return `line-${lineKeySeq}`;
}

function emptyLine(): IngredientLineValue {
  return { key: newLineKey(), ingredientId: null, ingredientName: "", quantityG: "" };
}

function linesFromDetail(detail: RecipeDetail): IngredientLineValue[] {
  if (detail.ingredients.length === 0) return [emptyLine()];
  return [...detail.ingredients]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ing) => ({
      key: newLineKey(),
      ingredientId: ing.ingredient_id,
      ingredientName: ing.name,
      quantityG: String(ing.quantity_g),
      note: ing.note ?? undefined,
    }));
}

/**
 * Shared create/edit form (mirrors `QuickAddRecipe`'s field set, with the
 * new `Combobox`-based ingredient search instead of the old bespoke
 * dropdown). Create fires a single `POST /api/recipes`; edit fires two
 * separate calls — `PATCH` for title/servings/instructions and
 * `PUT .../ingredients` for the ingredient list — since that's how the API
 * splits them, and a failure of either must not lose the other's already-
 * applied change.
 */
export function RecipeForm({ mode, initial, onSaved, onCancel }: RecipeFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [servings, setServings] = useState(initial ? String(initial.servings) : "1");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [lines, setLines] = useState<IngredientLineValue[]>(initial ? linesFromDetail(initial) : [emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [ingredientsError, setIngredientsError] = useState<string | null>(null);

  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const replaceIngredients = useReplaceRecipeIngredients();

  function updateLine(key: string, value: IngredientLineValue) {
    setLines((prev) => prev.map((l) => (l.key === key ? value : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }
  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  const validLines = lines.filter((l) => l.ingredientId !== null && Number(l.quantityG) > 0);
  const isPending = createRecipe.isPending || updateRecipe.isPending || replaceIngredients.isPending;
  const canSubmit = title.trim() !== "" && validLines.length > 0 && !isPending;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIngredientsError(null);

    const ingredients = validLines.map((l, i) => ({
      ingredient_id: l.ingredientId!,
      quantity_g: Number(l.quantityG),
      sort_order: i,
      ...(l.note ? { note: l.note } : {}),
    }));

    if (mode === "create") {
      createRecipe.mutate(
        {
          title: title.trim(),
          servings: Number(servings) || 1,
          instructions: instructions.trim() || undefined,
          ingredients,
        },
        {
          onSuccess: (recipe) => onSaved(recipe),
          onError: (err) => setError(err instanceof Error ? err.message : "Couldn't create recipe"),
        },
      );
      return;
    }

    if (!initial) return;
    updateRecipe.mutate(
      {
        id: initial.id,
        updates: { title: title.trim(), servings: Number(servings) || 1, instructions: instructions.trim() },
      },
      {
        onSuccess: (recipe) => {
          replaceIngredients.mutate(
            { id: initial.id, ingredients },
            {
              onSuccess: () => onSaved(recipe),
              onError: (err) =>
                setIngredientsError(
                  `Details saved, but the ingredient list failed to update — ${
                    err instanceof Error ? err.message : "try saving again"
                  }`,
                ),
            },
          );
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't save recipe details"),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <Textarea
        label="Instructions"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        rows={6}
        placeholder="Optional — steps, notes, etc."
      />

      <div className="space-y-2">
        <p className="text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)]">Ingredients</p>
        {lines.map((line) => (
          <div
            key={line.key}
            className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-2"
          >
            <div className="min-w-0 flex-1">
              <IngredientCombobox
                value={line.ingredientName}
                isSelected={line.ingredientId !== null}
                onSelect={(ingredient) =>
                  updateLine(line.key, { ...line, ingredientId: ingredient.id, ingredientName: ingredient.name })
                }
                onClear={() => updateLine(line.key, { ...line, ingredientId: null, ingredientName: "" })}
              />
            </div>
            <Field
              label="Grams"
              type="number"
              min={0}
              value={line.quantityG}
              onChange={(e) => updateLine(line.key, { ...line, quantityG: e.target.value })}
              className="w-24"
            />
            {lines.length > 1 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeLine(line.key)}
                className="mt-6"
                aria-label="Remove ingredient line"
              >
                Remove
              </Button>
            )}
          </div>
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
      {ingredientsError && (
        <p role="alert" className="text-[length:var(--text-caption)] text-[var(--color-error)]">
          {ingredientsError}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={isPending} disabled={!canSubmit}>
          {mode === "create" ? "Create recipe" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
