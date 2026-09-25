import { useState } from "react";
import { Pill } from "lucide-react";
import { Button, EmptyState, Spinner } from "../ui";
import { useDeleteRoutineItem, useRoutineItems } from "../../hooks/useSupplements";
import { RoutineItemCard } from "./RoutineItemCard";
import { RoutineItemForm } from "./RoutineItemForm";

/** Routine tab: CRUD list of weekly routine items, ordered by slot (nulls
 * last) then supplement name, per the API's own ordering. */
export function RoutineTab() {
  const { data: items, isPending, error } = useRoutineItems();
  const deleteItem = useDeleteRoutineItem();
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [adding, setAdding] = useState(false);

  function handleDelete(id: number) {
    setRemovingIds((prev) => new Set(prev).add(id));
    setRowErrors((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    deleteItem.mutate(id, {
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

  const visibleItems = (items ?? []).filter((item) => !removingIds.has(item.id));

  return (
    <div className="space-y-3">
      {isPending && (
        <div className="flex justify-center py-8">
          <Spinner label="Loading your routine" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-error)]">
          Couldn't load your routine: {error.message}
        </p>
      )}

      {!isPending && !error && visibleItems.length === 0 && !adding && (
        <EmptyState
          icon={<Pill aria-hidden="true" />}
          title="You don't have a supplement routine set up yet."
          description="Add items to build a weekly schedule, or just log doses ad hoc from Today."
          action={
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              + Add to routine
            </Button>
          }
        />
      )}

      {!isPending &&
        !error &&
        visibleItems.map((item) => (
          <RoutineItemCard key={item.id} item={item} onDelete={handleDelete} deleteError={rowErrors[item.id]} />
        ))}

      {!isPending && !error && !adding && visibleItems.length > 0 && (
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
          + Add to routine
        </Button>
      )}

      {adding && <RoutineItemForm onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />}
    </div>
  );
}
