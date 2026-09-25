import { useState } from "react";
import { Pill } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, Field, Spinner } from "../ui";
import { useDeleteSupplement, useRoutineItems, useSupplements } from "../../hooks/useSupplements";
import { SupplementForm } from "./SupplementForm";
import { SupplementListRow } from "./SupplementListRow";
import type { Supplement } from "../../api/supplements";

interface PendingDelete {
  supplement: Supplement;
  routineCount: number;
}

/** Supplement list tab: CRUD the user's supplement products. Delete has one
 * confirmation — only when the supplement has active routine items, since
 * that's the one case with a hidden side effect (cascade-removal from the
 * schedule); a plain delete with no routine items stays confirmation-free. */
export function SupplementListTab() {
  const { data: supplements, isPending, error } = useSupplements();
  const { data: routineItems } = useRoutineItems();
  const deleteSupplement = useDeleteSupplement();

  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = (supplements ?? []).filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.brand ?? "").toLowerCase().includes(q);
  });

  function routineCountFor(supplementId: number): number {
    return (routineItems ?? []).filter((ri) => ri.supplement_id === supplementId).length;
  }

  function handleDeleteClick(supplement: Supplement) {
    setDeleteError(null);
    const routineCount = routineCountFor(supplement.id);
    if (routineCount > 0) {
      setPendingDelete({ supplement, routineCount });
    } else {
      performDelete(supplement);
    }
  }

  function performDelete(supplement: Supplement) {
    deleteSupplement.mutate(supplement.id, {
      onSuccess: () => setPendingDelete(null),
      onError: () => {
        setPendingDelete(null);
        setDeleteError(
          `Couldn't delete ${supplement.name} — it's been logged before, so past history can't be removed.`,
        );
      },
    });
  }

  return (
    <div className="space-y-3">
      <Field
        type="search"
        label="Search supplements"
        placeholder="Search supplements..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {deleteError && (
        <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-error)]">
          {deleteError}
        </p>
      )}

      {isPending && (
        <div className="flex justify-center py-8">
          <Spinner label="Loading supplements" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-error)]">
          Couldn't load your supplements: {error.message}
        </p>
      )}

      {!isPending && !error && (supplements?.length ?? 0) === 0 && !adding && (
        <EmptyState
          icon={<Pill aria-hidden="true" />}
          title="No supplements yet."
          action={
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              + Add supplement
            </Button>
          }
        />
      )}

      {!isPending &&
        !error &&
        filtered.map((supplement) =>
          editingId === supplement.id ? (
            <SupplementForm
              key={supplement.id}
              supplement={supplement}
              onSaved={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <SupplementListRow
              key={supplement.id}
              supplement={supplement}
              onEdit={() => setEditingId(supplement.id)}
              onDelete={() => handleDeleteClick(supplement)}
            />
          ),
        )}

      {!isPending && !error && (supplements?.length ?? 0) > 0 && !adding && (
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
          + Add supplement
        </Button>
      )}

      {adding && <SupplementForm onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this supplement?"
        description={
          pendingDelete && (
            <>
              Deleting {pendingDelete.supplement.name} will also remove it from your routine (
              {pendingDelete.routineCount} scheduled slot{pendingDelete.routineCount === 1 ? "" : "s"}). Past log
              history is kept.
            </>
          )
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteSupplement.isPending}
        onConfirm={() => pendingDelete && performDelete(pendingDelete.supplement)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
