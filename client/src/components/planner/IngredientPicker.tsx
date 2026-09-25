import { useState } from "react";
import { Button, Combobox, Field } from "../ui";
import { useIngredients } from "../../hooks/useIngredients";
import { useAddIngredientToPlan, useUpsertMealPlan } from "../../hooks/useMealPlans";
import { QuickAddIngredient } from "./QuickAddIngredient";
import type { Ingredient, MealType } from "../../api/types";

interface IngredientPickerProps {
  date: string;
  mealType: MealType;
}

/** Same inline-expand shape as RecipePicker, using the shared Combobox to
 *  search existing ingredients (GET /api/ingredients?search=), then adding
 *  it straight to the plan slot without a recipe in between. */
export function IngredientPicker({ date, mealType }: IngredientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [grams, setGrams] = useState("");
  const [markEaten, setMarkEaten] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: results, isPending, isError } = useIngredients(query || undefined);
  const upsertMealPlan = useUpsertMealPlan();
  const addIngredientToPlan = useAddIngredientToPlan();

  function reset() {
    setOpen(false);
    setQuery("");
    setSelected(null);
    setGrams("");
    setMarkEaten(false);
    setShowCreateNew(false);
    setError(null);
  }

  function handleIngredientCreated(ingredient: Ingredient) {
    setShowCreateNew(false);
    setSelected(ingredient);
  }

  const gramsNum = Number(grams);
  const isSubmitting = upsertMealPlan.isPending || addIngredientToPlan.isPending;
  const canSubmit = selected !== null && gramsNum > 0 && !isSubmitting;

  function handleSubmit() {
    if (!selected) return;
    setError(null);
    upsertMealPlan.mutate(
      { plan_date: date, meal_type: mealType },
      {
        onSuccess: (plan) => {
          addIngredientToPlan.mutate(
            { mealPlanId: plan.id, ingredientId: selected.id, quantityG: gramsNum, eaten: markEaten },
            {
              onSuccess: () => reset(),
              onError: (err) => setError(err instanceof Error ? err.message : "Couldn't add ingredient"),
            },
          );
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't add ingredient"),
      },
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2 text-left text-[length:var(--text-body-sm)] font-medium text-[var(--color-primary)] hover:underline"
      >
        + Add ingredient
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
      {showCreateNew ? (
        <QuickAddIngredient onCreated={handleIngredientCreated} onCancel={() => setShowCreateNew(false)} />
      ) : (
        <div className="space-y-3">
          <Combobox
            label="Ingredient"
            placeholder="Search existing ingredients..."
            value={selected?.name ?? ""}
            onSearch={setQuery}
            onSelect={setSelected}
            onClear={() => setSelected(null)}
            items={results ?? []}
            isLoading={isPending}
            isError={isError}
            getKey={(ingredient) => ingredient.id}
            getLabel={(ingredient) => ingredient.name}
            isSelected={selected !== null}
            onCreateNew={() => setShowCreateNew(true)}
            createNewLabel={() => "+ Create new ingredient"}
            required
          />
          <Field label="Grams" type="number" min={0} value={grams} onChange={(e) => setGrams(e.target.value)} />
          <label className="flex min-h-11 items-center gap-2 text-[length:var(--text-body-sm)] text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={markEaten}
              onChange={(e) => setMarkEaten(e.target.checked)}
              className="h-5 w-5 cursor-pointer accent-[var(--color-primary)]"
            />
            Mark eaten now
          </label>

          {error && (
            <p role="alert" className="text-[length:var(--text-caption)] text-[var(--color-error)]">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} loading={isSubmitting} disabled={!canSubmit}>
              Add to plan
            </Button>
            <Button size="sm" variant="ghost" onClick={reset} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
