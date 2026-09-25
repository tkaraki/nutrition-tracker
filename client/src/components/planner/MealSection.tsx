import { useMemo, useState } from "react";
import { Card } from "../ui";
import { useRemoveIngredientFromPlan, useRemoveRecipeFromPlan } from "../../hooks/useMealPlans";
import { IngredientPicker } from "./IngredientPicker";
import { IngredientRow } from "./IngredientRow";
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

// Composite keys (kind-prefixed) so recipe and ingredient row ids — which
// come from two different DB tables and can numerically collide — never
// clash in the shared removingIds/rowErrors maps below.
type RowKey = `recipe:${number}` | `ingredient:${number}`;

export function MealSection({ mealType, date, plan }: MealSectionProps) {
  const recipes = plan?.recipes ?? [];
  const ingredients = plan?.ingredients ?? [];

  // Interleave recipes and direct ingredients into one flat list, ordered by
  // id (a proxy for insertion order) rather than grouped — matches how a
  // user thinks about "what's in this meal."
  const items = useMemo(() => {
    return [
      ...recipes.map((recipe) => ({ kind: "recipe" as const, id: recipe.id, recipe })),
      ...ingredients.map((ingredient) => ({ kind: "ingredient" as const, id: ingredient.id, ingredient })),
    ].sort((a, b) => a.id - b.id);
  }, [recipes, ingredients]);

  // Optimistic remove: rows in `removingKeys` are hidden immediately, before
  // the server confirms. A failed removal un-hides the row and surfaces an
  // error against that row only.
  const [removingKeys, setRemovingKeys] = useState<Set<RowKey>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<RowKey, string>>({});
  const removeRecipe = useRemoveRecipeFromPlan();
  const removeIngredient = useRemoveIngredientFromPlan();

  function handleRemove(key: RowKey, id: number, kind: "recipe" | "ingredient") {
    setRemovingKeys((prev) => new Set(prev).add(key));
    setRowErrors((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
    const mutation = kind === "recipe" ? removeRecipe : removeIngredient;
    mutation.mutate(id, {
      onError: () => {
        setRemovingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setRowErrors((prev) => ({ ...prev, [key]: "Couldn't remove — try again" }));
      },
    });
  }

  const visibleItems = items.filter((item) => !removingKeys.has(`${item.kind}:${item.id}`));

  return (
    <Card>
      <h2 className="mb-2 text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)]">
        {MEAL_TYPE_LABELS[mealType]}
      </h2>
      {visibleItems.length > 0 && (
        <div>
          {visibleItems.map((item) => {
            const key: RowKey = `${item.kind}:${item.id}`;
            return item.kind === "recipe" ? (
              <RecipeRow
                key={key}
                recipe={item.recipe}
                onRemove={(id) => handleRemove(key, id, "recipe")}
                removeError={rowErrors[key]}
              />
            ) : (
              <IngredientRow
                key={key}
                ingredient={item.ingredient}
                onRemove={(id) => handleRemove(key, id, "ingredient")}
                removeError={rowErrors[key]}
              />
            );
          })}
        </div>
      )}
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <RecipePicker date={date} mealType={mealType} />
        </div>
        <div className="min-w-0 sm:flex-1">
          <IngredientPicker date={date} mealType={mealType} />
        </div>
      </div>
    </Card>
  );
}
