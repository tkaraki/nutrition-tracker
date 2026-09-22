import { useEffect, useId, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui";
import { useRecipe } from "../../hooks/useRecipes";
import { useSetRecipeEaten } from "../../hooks/useMealPlans";
import type { MealPlanRecipe } from "../../api/types";

interface RecipeRowProps {
  recipe: MealPlanRecipe;
  /** Called to kick off removal — the parent owns the optimistic hide/unhide. */
  onRemove: (id: number) => void;
  /** Set by the parent when a remove attempt for this row failed. */
  removeError?: string;
}

function formatServings(n: number): string {
  return `${n} serving${n === 1 ? "" : "s"}`;
}

export function RecipeRow({ recipe, onRemove, removeError }: RecipeRowProps) {
  const checkboxId = useId();
  const actualEaten = recipe.eaten_at !== null;

  // Optimistic eaten/not-eaten state: flips immediately on toggle, and quietly
  // clears itself once the server-confirmed value (via cache invalidation)
  // catches up — avoiding a flicker back to the stale value in between.
  const [pendingEaten, setPendingEaten] = useState<boolean | null>(null);
  const [eatenError, setEatenError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingEaten !== null && actualEaten === pendingEaten) {
      setPendingEaten(null);
    }
  }, [actualEaten, pendingEaten]);

  const displayedEaten = pendingEaten ?? actualEaten;

  const setEaten = useSetRecipeEaten();

  function handleToggle() {
    const next = !displayedEaten;
    setPendingEaten(next);
    setEatenError(null);
    setEaten.mutate(
      { id: recipe.id, eaten: next },
      {
        onError: () => {
          setPendingEaten(null);
          setEatenError("Couldn't update — try again");
        },
      },
    );
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  function handleRemoveClick() {
    if (displayedEaten) {
      setConfirmingRemove(true);
    } else {
      setMenuOpen(false);
      onRemove(recipe.id);
    }
  }

  function confirmRemove() {
    setConfirmingRemove(false);
    setMenuOpen(false);
    onRemove(recipe.id);
  }

  const { data: recipeDetail } = useRecipe(recipe.recipe_id);
  const kcal = useMemo(() => {
    if (!recipeDetail) return null;
    const totalKcal = recipeDetail.ingredients.reduce(
      (sum, ing) => sum + (ing.calories_kcal * ing.quantity_g) / 100,
      0,
    );
    const perFullYield = totalKcal * (recipe.servings / (recipeDetail.servings || 1));
    return Math.round(perFullYield);
  }, [recipeDetail, recipe.servings]);

  return (
    <div className="border-b border-[var(--color-border)] py-1 last:border-b-0">
      <div className="flex items-center gap-1">
        <label
          htmlFor={checkboxId}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={displayedEaten}
            onChange={handleToggle}
            className="h-5 w-5 cursor-pointer accent-[var(--color-primary)]"
            aria-label={`Mark ${recipe.title ?? "recipe"} as eaten`}
          />
        </label>

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[length:var(--text-body-sm)] font-medium ${
              displayedEaten ? "text-[var(--color-text-subtle)] line-through" : "text-[var(--color-text)]"
            }`}
          >
            {recipe.title ?? "Recipe"}
          </p>
          <p className="text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
            {formatServings(recipe.servings)}
            {kcal !== null ? ` · ${kcal}kcal` : ""}
          </p>
          {eatenError && (
            <p role="alert" className="mt-0.5 text-[length:var(--text-caption)] text-[var(--color-error)]">
              {eatenError}
            </p>
          )}
          {removeError && !confirmingRemove && (
            <p role="alert" className="mt-0.5 text-[length:var(--text-caption)] text-[var(--color-error)]">
              {removeError}
            </p>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={`Actions for ${recipe.title ?? "recipe"}`}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="flex h-11 w-11 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 min-w-32 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
              <button
                type="button"
                onClick={handleRemoveClick}
                className="block w-full px-3 py-2 text-left text-[length:var(--text-body-sm)] text-[var(--color-error)] hover:bg-[var(--color-surface-alt)]"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmingRemove && (
        <div className="ml-11 mb-2 rounded-[var(--radius-sm)] border border-[var(--color-warning-border)] bg-[var(--color-warning-wash)] p-2 text-[length:var(--text-caption)]">
          <p>
            Remove eaten {recipe.title ?? "recipe"}? This will also remove it from today's totals.
          </p>
          <div className="mt-1 flex gap-2">
            <Button size="sm" variant="destructive" onClick={confirmRemove}>
              Remove
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingRemove(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
