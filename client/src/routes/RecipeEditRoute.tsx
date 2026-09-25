import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { RecipeForm } from "../components/library/RecipeForm";
import { useRecipe } from "../hooks/useRecipes";

export function RecipeEditRoute() {
  const { id } = useParams<{ id: string }>();
  const recipeId = Number(id);
  const navigate = useNavigate();
  const recipeQuery = useRecipe(Number.isFinite(recipeId) ? recipeId : undefined);

  if (recipeQuery.isPending) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-48 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]" />
        <div className="h-96 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]" />
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-[length:var(--text-heading-lg)] font-semibold text-[var(--color-text)]">Edit recipe</h1>
      <Card>
        <RecipeForm
          mode="edit"
          initial={recipeQuery.data}
          onSaved={(recipe) => navigate(`/library/recipes/${recipe.id}`)}
          onCancel={() => navigate(`/library/recipes/${recipeQuery.data.id}`)}
        />
      </Card>
    </div>
  );
}
