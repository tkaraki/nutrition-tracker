import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { RecipeNutrientTable } from "../components/library/RecipeNutrientTable";
import { useRecipe } from "../hooks/useRecipes";
import { useIngredientsByIds } from "../hooks/useIngredients";
import { NUTRIENT_KEYS, type NutrientKey } from "../lib/nutrients";
import type { Ingredient } from "../api/types";

/**
 * Read-only recipe detail. GET /api/recipes/:id only joins 5 of 11 nutrient
 * columns per ingredient line (architecture doc D flags widening that
 * endpoint as the cheaper fix); until that lands, this fetches each unique
 * ingredient's full detail in parallel (mirrors RecipeRow's existing
 * per-recipe extra-fetch pattern) to compute a full 11-nutrient per-serving
 * breakdown client-side.
 */
export function RecipeDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const recipeId = Number(id);
  const recipeQuery = useRecipe(Number.isFinite(recipeId) ? recipeId : undefined);

  const uniqueIngredientIds = useMemo(() => {
    if (!recipeQuery.data) return [];
    return Array.from(new Set(recipeQuery.data.ingredients.map((ing) => ing.ingredient_id)));
  }, [recipeQuery.data]);

  const ingredientDetailQueries = useIngredientsByIds(uniqueIngredientIds);
  const detailsLoading = ingredientDetailQueries.some((q) => q.isPending);

  const ingredientsById = useMemo(() => {
    const map = new Map<number, Ingredient>();
    uniqueIngredientIds.forEach((ingId, i) => {
      const data = ingredientDetailQueries[i]?.data;
      if (data) map.set(ingId, data);
    });
    return map;
  }, [uniqueIngredientIds, ingredientDetailQueries]);

  const totals = useMemo(() => {
    const sums = {} as Record<NutrientKey, number>;
    for (const key of NUTRIENT_KEYS) sums[key] = 0;
    if (!recipeQuery.data) return sums;

    for (const ing of recipeQuery.data.ingredients) {
      const full = ingredientsById.get(ing.ingredient_id);
      if (!full) continue;
      for (const key of NUTRIENT_KEYS) {
        sums[key] += (full[key] * ing.quantity_g) / 100;
      }
    }
    const servings = recipeQuery.data.servings || 1;
    for (const key of NUTRIENT_KEYS) sums[key] = sums[key] / servings;
    return sums;
  }, [recipeQuery.data, ingredientsById]);

  if (recipeQuery.isPending) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-48 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]" />
        <div className="h-32 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]" />
        <div className="h-64 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]" />
      </div>
    );
  }

  if (recipeQuery.isError || !recipeQuery.data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            Couldn't load this recipe.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => recipeQuery.refetch()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const recipe = recipeQuery.data;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Link
        to="/library"
        className="inline-flex items-center gap-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Library
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[length:var(--text-heading-lg)] font-semibold text-[var(--color-text)]">
            {recipe.title}
          </h1>
          <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            {recipe.servings} serving{recipe.servings === 1 ? "" : "s"}
          </p>
        </div>
        <Link to={`/library/recipes/${recipe.id}/edit`}>
          <Button variant="secondary">Edit</Button>
        </Link>
      </div>

      {recipe.instructions && (
        <Card>
          <h2 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)] mb-2">
            Instructions
          </h2>
          <p className="whitespace-pre-wrap text-[length:var(--text-body-sm)] text-[var(--color-text)]">
            {recipe.instructions}
          </p>
        </Card>
      )}

      <Card>
        <h2 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)] mb-2">
          Ingredients
        </h2>
        <ul className="divide-y divide-[var(--color-border)]">
          {recipe.ingredients.map((ing) => (
            <li key={ing.id} className="flex items-center justify-between py-2 text-[length:var(--text-body-sm)]">
              <span className="text-[var(--color-text)]">{ing.name}</span>
              <span className="text-[var(--color-text-muted)]">{ing.quantity_g} g</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)] mb-2">
          Per serving
        </h2>
        <RecipeNutrientTable totals={totals} loading={detailsLoading} />
      </Card>
    </div>
  );
}
