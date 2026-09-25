import { Button } from "../ui";
import { formatAmount } from "../nutrition/formatAmount";
import type { Ingredient } from "../../api/types";

interface IngredientListRowProps {
  ingredient: Ingredient;
  onEdit: () => void;
  onDelete: () => void;
}

/** One row in Library's Ingredients list: primary-4 nutrients per 100g
 *  inline (full 11-field breakdown lives in the edit form, not here). */
export function IngredientListRow({ ingredient, onEdit, onDelete }: IngredientListRowProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)]">
          {ingredient.name}
        </p>
        <p className="text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
          {formatAmount(ingredient.calories_kcal, "kcal")} kcal · {formatAmount(ingredient.protein_g)} g protein ·{" "}
          {formatAmount(ingredient.carbs_g)} g carbs · {formatAmount(ingredient.fat_g)} g fat (per 100 g)
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
