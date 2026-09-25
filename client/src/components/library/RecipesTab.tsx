import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Card, EmptyState, Field } from "../ui";
import { useDeleteRecipe, useRecipes, useSetRecipeArchived } from "../../hooks/useRecipes";
import { RecipeForm } from "./RecipeForm";
import { RecipeListRow } from "./RecipeListRow";
import type { CreatedRecipe, Recipe } from "../../api/types";
import type { RecipeWithArchived } from "../../api/recipes";

/**
 * GET /api/recipes has no server-side search (architecture doc resolved
 * open question 5: client-side filtering is fine at expected library
 * sizes). Fetches the full list including archived once, then splits it
 * client-side into active/archived — cheaper than two separate requests
 * and gives an accurate "Show archived (N)" count immediately.
 */
export function RecipesTab() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedNotice, setArchivedNotice] = useState<{ id: number; title: string } | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const recipesQuery = useRecipes(true);
  const deleteRecipe = useDeleteRecipe();
  const setArchived = useSetRecipeArchived();

  const { active, archived } = useMemo(() => {
    const all = recipesQuery.data ?? [];
    return {
      active: all.filter((r) => r.archived_at === null),
      archived: all.filter((r) => r.archived_at !== null),
    };
  }, [recipesQuery.data]);

  const filteredActive = useMemo(() => filterByTitle(active, search), [active, search]);
  const filteredArchived = useMemo(() => filterByTitle(archived, search), [archived, search]);

  function handleCreated(_recipe: Recipe | CreatedRecipe) {
    setShowCreate(false);
  }

  function handleArchiveOrDelete(recipe: RecipeWithArchived) {
    setRowError(null);
    setPendingId(recipe.id);
    deleteRecipe.mutate(recipe.id, {
      onSuccess: (result) => {
        if (result.archived) setArchivedNotice({ id: recipe.id, title: recipe.title });
      },
      onError: (err) =>
        setRowError({ id: recipe.id, message: err instanceof Error ? err.message : "Couldn't delete recipe" }),
      onSettled: () => setPendingId(null),
    });
  }

  function handleRestore(id: number) {
    setRowError(null);
    setPendingId(id);
    setArchived.mutate(
      { id, archived: false },
      {
        onError: (err) =>
          setRowError({ id, message: err instanceof Error ? err.message : "Couldn't restore recipe" }),
        onSettled: () => setPendingId(null),
      },
    );
  }

  function handleUndoArchive(id: number) {
    setPendingId(id);
    setArchived.mutate(
      { id, archived: false },
      { onSuccess: () => setArchivedNotice(null), onSettled: () => setPendingId(null) },
    );
  }

  if (recipesQuery.isPending) {
    return (
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]" />
        ))}
      </div>
    );
  }

  if (recipesQuery.isError) {
    return (
      <Card className="mt-4">
        <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          Couldn't load your recipes.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => recipesQuery.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (active.length === 0 && archived.length === 0 && !showCreate) {
    return (
      <EmptyState
        icon={<BookOpen aria-hidden="true" />}
        title="No recipes yet."
        description="Create one, or import from a URL."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setShowCreate(true)}>+ New recipe</Button>
            <Link to="/library/import">
              <Button variant="secondary">Import from URL/text</Button>
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <Field
          label="Search recipes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title..."
          className="sm:max-w-xs"
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Cancel" : "+ New recipe"}
          </Button>
          <Link to="/library/import">
            <Button variant="secondary">Import from URL/text →</Button>
          </Link>
        </div>
      </div>

      {showCreate && (
        <Card>
          <RecipeForm mode="create" onSaved={handleCreated} onCancel={() => setShowCreate(false)} />
        </Card>
      )}

      {archivedNotice && (
        <Card className="border-[var(--color-warning-border)] bg-[var(--color-warning-wash)]">
          <p className="text-[length:var(--text-body-sm)]">
            Archived "{archivedNotice.title}" — still used in your meal plan history, so it's hidden here
            instead of deleted.{" "}
            <button
              type="button"
              className="font-medium underline"
              onClick={() => handleUndoArchive(archivedNotice.id)}
            >
              Undo
            </button>
          </p>
        </Card>
      )}

      <div className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
        {filteredActive.length === 0 ? (
          <p className="px-4 py-6 text-center text-[length:var(--text-body-sm)] text-[var(--color-text-subtle)]">
            No recipes match "{search}".
          </p>
        ) : (
          filteredActive.map((recipe) => (
            <RecipeListRow
              key={recipe.id}
              recipe={recipe}
              onArchive={() => handleArchiveOrDelete(recipe)}
              archiving={pendingId === recipe.id && deleteRecipe.isPending}
              error={rowError?.id === recipe.id ? rowError.message : undefined}
            />
          ))
        )}
      </div>

      {archived.length > 0 && (
        <div>
          <button
            type="button"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((v) => !v)}
            className="inline-flex items-center gap-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {showArchived ? "Hide archived" : `Show archived (${archived.length})`}
            <span aria-hidden="true">▾</span>
          </button>
          {showArchived && (
            <div className="mt-2 divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
              {filteredArchived.map((recipe) => (
                <RecipeListRow
                  key={recipe.id}
                  recipe={recipe}
                  archivedRow
                  onRestore={() => handleRestore(recipe.id)}
                  restoring={pendingId === recipe.id && setArchived.isPending}
                  onDelete={() => handleArchiveOrDelete(recipe)}
                  deleting={pendingId === recipe.id && deleteRecipe.isPending}
                  error={rowError?.id === recipe.id ? rowError.message : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function filterByTitle(recipes: RecipeWithArchived[], search: string): RecipeWithArchived[] {
  const q = search.trim().toLowerCase();
  if (!q) return recipes;
  return recipes.filter((r) => r.title.toLowerCase().includes(q));
}
