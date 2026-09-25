import { useState } from "react";
import { Apple } from "lucide-react";
import { Button, Card, ConfirmDialog, EmptyState, Field } from "../ui";
import { useDeleteIngredient, useIngredients } from "../../hooks/useIngredients";
import { IngredientForm } from "./IngredientForm";
import { IngredientListRow } from "./IngredientListRow";
import { ApiError } from "../../api/client";

/** GET /api/ingredients?search= — server-side search, debounce-free here
 *  since the query itself is cheap and TanStack Query dedupes rapid
 *  refetches via its query key. */
export function IngredientsTab() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const ingredientsQuery = useIngredients(search || undefined);
  const deleteIngredient = useDeleteIngredient();

  const confirmTarget = ingredientsQuery.data?.find((i) => i.id === confirmDeleteId) ?? null;

  function handleDeleteConfirm() {
    if (confirmDeleteId === null) return;
    setDeleteError(null);
    deleteIngredient.mutate(confirmDeleteId, {
      onSuccess: () => setConfirmDeleteId(null),
      onError: (err) => {
        // 409 == ON DELETE RESTRICT (referenced by recipe_ingredients or
        // meal_plan_ingredients) — the plain 409 carries no count, so the
        // message stays generic per the spec.
        if (err instanceof ApiError && err.status === 409) {
          setDeleteError("Can't delete — it's used in one or more recipes/plans. Remove those references first.");
        } else {
          setDeleteError(err instanceof Error ? err.message : "Couldn't delete ingredient");
        }
      },
    });
  }

  if (ingredientsQuery.isPending) {
    return (
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]" />
        ))}
      </div>
    );
  }

  if (ingredientsQuery.isError) {
    return (
      <Card className="mt-4">
        <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          Couldn't load ingredients.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => ingredientsQuery.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const ingredients = ingredientsQuery.data ?? [];

  if (ingredients.length === 0 && !search && !showCreate) {
    return (
      <EmptyState
        icon={<Apple aria-hidden="true" />}
        title="No ingredients yet."
        action={<Button onClick={() => setShowCreate(true)}>+ New ingredient</Button>}
      />
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <Field
          label="Search ingredients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients..."
          className="sm:max-w-xs"
        />
        <Button variant="secondary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "+ New ingredient"}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <IngredientForm mode="create" onSaved={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
        </Card>
      )}

      {ingredients.length === 0 ? (
        <p className="px-4 py-6 text-center text-[length:var(--text-body-sm)] text-[var(--color-text-subtle)]">
          No ingredients match "{search}".
        </p>
      ) : (
        <div className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {ingredients.map((ingredient) =>
            editingId === ingredient.id ? (
              <div key={ingredient.id} className="p-3">
                <IngredientForm
                  mode="edit"
                  initial={ingredient}
                  onSaved={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <IngredientListRow
                key={ingredient.id}
                ingredient={ingredient}
                onEdit={() => setEditingId(ingredient.id)}
                onDelete={() => {
                  setDeleteError(null);
                  setConfirmDeleteId(ingredient.id);
                }}
              />
            ),
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title={`Delete ${confirmTarget?.name ?? "ingredient"}?`}
        description="This is a shared ingredient — if it's used in any recipe or logged meal, deletion may fail or affect other data."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteIngredient.isPending}
        error={deleteError ?? undefined}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmDeleteId(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
