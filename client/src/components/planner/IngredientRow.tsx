import { useEffect, useId, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button, Field } from "../ui";
import { useRemoveIngredientFromPlan, useSetIngredientEaten, useUpdateMealPlanIngredient } from "../../hooks/useMealPlans";
import type { MealPlanIngredient } from "../../api/types";

interface IngredientRowProps {
  ingredient: MealPlanIngredient;
  /** Called to kick off removal — the parent owns the optimistic hide/unhide. */
  onRemove: (id: number) => void;
  /** Set by the parent when a remove attempt for this row failed. */
  removeError?: string;
}

/** Sibling to RecipeRow, same visual language — a direct-ingredient line in
 *  a meal's flat list. Unlike RecipeRow, kcal comes straight off the row
 *  (the API already scales nutrient columns to this row's quantity_g), no
 *  extra fetch needed. */
export function IngredientRow({ ingredient, onRemove, removeError }: IngredientRowProps) {
  const checkboxId = useId();
  const actualEaten = ingredient.eaten_at !== null;

  // Optimistic eaten/not-eaten state, same pattern as RecipeRow.
  const [pendingEaten, setPendingEaten] = useState<boolean | null>(null);
  const [eatenError, setEatenError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingEaten !== null && actualEaten === pendingEaten) {
      setPendingEaten(null);
    }
  }, [actualEaten, pendingEaten]);

  const displayedEaten = pendingEaten ?? actualEaten;

  const setEaten = useSetIngredientEaten();

  function handleToggle() {
    const next = !displayedEaten;
    setPendingEaten(next);
    setEatenError(null);
    setEaten.mutate(
      { id: ingredient.id, eaten: next },
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
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [quantityInput, setQuantityInput] = useState(String(ingredient.quantity_g));
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const updateQuantity = useUpdateMealPlanIngredient();

  function handleRemoveClick() {
    if (displayedEaten) {
      setConfirmingRemove(true);
    } else {
      setMenuOpen(false);
      onRemove(ingredient.id);
    }
  }

  function confirmRemove() {
    setConfirmingRemove(false);
    setMenuOpen(false);
    onRemove(ingredient.id);
  }

  function handleEditClick() {
    setQuantityInput(String(ingredient.quantity_g));
    setQuantityError(null);
    setEditingQuantity(true);
    setMenuOpen(false);
  }

  function handleSaveQuantity() {
    const next = Number(quantityInput);
    if (!(next > 0)) {
      setQuantityError("Must be greater than 0");
      return;
    }
    setQuantityError(null);
    updateQuantity.mutate(
      { id: ingredient.id, updates: { quantity_g: next } },
      {
        onSuccess: () => setEditingQuantity(false),
        onError: (err) => setQuantityError(err instanceof Error ? err.message : "Couldn't save — try again"),
      },
    );
  }

  const kcal = Math.round(ingredient.calories_kcal);

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
            aria-label={`Mark ${ingredient.name} as eaten`}
          />
        </label>

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[length:var(--text-body-sm)] font-medium ${
              displayedEaten ? "text-[var(--color-text-subtle)] line-through" : "text-[var(--color-text)]"
            }`}
          >
            {ingredient.name}
          </p>
          <p className="text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
            {ingredient.quantity_g} g · {kcal} kcal
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
            aria-label={`Actions for ${ingredient.name}`}
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
                onClick={handleEditClick}
                className="block w-full px-3 py-2 text-left text-[length:var(--text-body-sm)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
              >
                Edit quantity
              </button>
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

      {editingQuantity && (
        <div className="ml-11 mb-2 flex items-end gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-2">
          <Field
            label="Grams"
            type="number"
            min={0}
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            error={quantityError ?? undefined}
            autoFocus
            className="w-28"
          />
          <Button size="sm" onClick={handleSaveQuantity} loading={updateQuantity.isPending}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingQuantity(false)}
            disabled={updateQuantity.isPending}
          >
            Cancel
          </Button>
        </div>
      )}

      {confirmingRemove && (
        <div className="ml-11 mb-2 rounded-[var(--radius-sm)] border border-[var(--color-warning-border)] bg-[var(--color-warning-wash)] p-2 text-[length:var(--text-caption)]">
          <p>
            Remove eaten {ingredient.name}? This will also remove it from today's totals.
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
