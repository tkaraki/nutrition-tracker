import { useState } from "react";
import { Card } from "../ui";
import { useRemoveRecipeFromPlan } from "../../hooks/useMealPlans";
import { RecipePicker } from "./RecipePicker";
import { RecipeRow } from "./RecipeRow";
import type { MealPlan, MealType } from "../../api/types";

interface MealSectionProps {
  mealType: MealType;
  date: string;
  plan: MealPlan | undefined;
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function MealSection({ mealType, date, plan }: MealSectionProps) {
  const recipes = plan?.recipes ?? [];

  // Optimistic remove: rows in `removingIds` are hidden immediately, before
  // the server confirms. A failed removal un-hides the row and surfaces an
  // error against that row only.
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const removeRecipe = useRemoveRecipeFromPlan();

  function handleRemove(id: number) {
    setRemovingIds((prev) => new Set(prev).add(id));
    setRowErrors((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    removeRecipe.mutate(id, {
      onError: () => {
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setRowErrors((prev) => ({ ...prev, [id]: "Couldn't remove — try again" }));
      },
    });
  }

  const visibleRecipes = recipes.filter((r) => !removingIds.has(r.id));

  return (
    <Card>
      <h2 className="mb-2 text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)]">
        {MEAL_TYPE_LABELS[mealType]}
      </h2>
      {visibleRecipes.length > 0 && (
        <div>
          {visibleRecipes.map((recipe) => (
            <RecipeRow key={recipe.id} recipe={recipe} onRemove={handleRemove} removeError={rowErrors[recipe.id]} />
          ))}
        </div>
      )}
      <RecipePicker date={date} mealType={mealType} />
    </Card>
  );
}
