import { useMemo, useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { Button, EmptyState, Field } from "../ui";
import { useRecipes } from "../../hooks/useRecipes";
import { useAddRecipeToPlan, useUpsertMealPlan } from "../../hooks/useMealPlans";
import { QuickAddRecipe } from "./QuickAddRecipe";
import type { CreatedRecipe, MealType, Recipe } from "../../api/types";

interface RecipePickerProps {
  date: string;
  mealType: MealType;
}

export function RecipePicker({ date, mealType }: RecipePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selected, setSelected] = useState<Recipe | CreatedRecipe | null>(null);
  const [servings, setServings] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const { data: recipes, isPending } = useRecipes();
  const upsertMealPlan = useUpsertMealPlan();
  const addRecipeToPlan = useAddRecipeToPlan();

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [recipes, search]);

  function reset() {
    setOpen(false);
    setSearch("");
    setShowQuickAdd(false);
    setSelected(null);
    setServings("1");
    setError(null);
  }

  function handleRecipeCreated(recipe: CreatedRecipe) {
    setShowQuickAdd(false);
    setSelected(recipe);
    setServings("1");
  }

  function handleConfirm() {
    if (!selected) return;
    setError(null);
    const servingsNum = Number(servings) || 1;
    upsertMealPlan.mutate(
      { plan_date: date, meal_type: mealType },
      {
        onSuccess: (plan) => {
          addRecipeToPlan.mutate(
            { mealPlanId: plan.id, recipeId: selected.id, servings: servingsNum },
            {
              onSuccess: () => reset(),
              onError: (err) => setError(err instanceof Error ? err.message : "Couldn't add recipe"),
            },
          );
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't add recipe"),
      },
    );
  }

  const isSubmitting = upsertMealPlan.isPending || addRecipeToPlan.isPending;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2 text-left text-[length:var(--text-body-sm)] font-medium text-[var(--color-primary)] hover:underline"
      >
        + Add recipe
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
      {selected ? (
        <div className="space-y-3">
          <p className="text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)]">
            {selected.title}
          </p>
          <Field
            label="Servings"
            type="number"
            min={0.25}
            step={0.25}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            autoFocus
          />
          {error && (
            <p role="alert" className="text-[length:var(--text-caption)] text-[var(--color-error)]">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleConfirm} loading={isSubmitting}>
              Add to plan
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)} disabled={isSubmitting}>
              Back
            </Button>
          </div>
        </div>
      ) : showQuickAdd ? (
        <QuickAddRecipe onCreated={handleRecipeCreated} onCancel={() => setShowQuickAdd(false)} />
      ) : isPending ? (
        <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-subtle)]">Loading recipes...</p>
      ) : recipes && recipes.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed aria-hidden="true" />}
          title="You don't have any recipes yet."
          action={
            <Button size="sm" onClick={() => setShowQuickAdd(true)}>
              Create a recipe
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          <Field
            label="Search recipes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title..."
            autoFocus
          />
          <div className="max-h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-[length:var(--text-caption)] text-[var(--color-text-subtle)]">
                No recipes match "{search}".
              </p>
            )}
            {filtered.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => setSelected(recipe)}
                className="block w-full border-b border-[var(--color-border)] px-3 py-2 text-left text-[length:var(--text-body-sm)] last:border-b-0 hover:bg-[var(--color-surface-alt)]"
              >
                {recipe.title}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowQuickAdd(true)}
            className="text-[length:var(--text-caption)] font-medium text-[var(--color-primary)] underline"
          >
            Can't find it? Create a recipe
          </button>
        </div>
      )}

      {!selected && !showQuickAdd && (
        <button
          type="button"
          onClick={reset}
          className="text-[length:var(--text-caption)] text-[var(--color-text-muted)] underline"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
