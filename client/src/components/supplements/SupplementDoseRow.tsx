import { useEffect, useId, useState } from "react";
import { Button } from "../ui";
import { useMarkRoutineItemTaken, useUndoRoutineItemTaken } from "../../hooks/useSupplements";
import { formatDose } from "./format";
import type { RoutineDayItem } from "../../api/supplements";

interface SupplementDoseRowProps {
  item: RoutineDayItem;
  date: string;
}

/** One scheduled dose in the Today checklist — real checkbox (large tap
 * target) plus a same-action ghost button, optimistic with revert-and-error
 * on failure, mirroring the Planner's RecipeRow eaten-toggle exactly. */
export function SupplementDoseRow({ item, date }: SupplementDoseRowProps) {
  const checkboxId = useId();
  const actualTaken = item.taken;

  const [pendingTaken, setPendingTaken] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingTaken !== null && actualTaken === pendingTaken) {
      setPendingTaken(null);
    }
  }, [actualTaken, pendingTaken]);

  const displayedTaken = pendingTaken ?? actualTaken;

  const markTaken = useMarkRoutineItemTaken(date);
  const undoTaken = useUndoRoutineItemTaken(date);

  function handleToggle() {
    const next = !displayedTaken;
    setPendingTaken(next);
    setError(null);
    const onError = () => {
      setPendingTaken(null);
      setError("Couldn't update — try again");
    };
    if (next) {
      markTaken.mutate(item.routine_item_id, { onError });
    } else {
      undoTaken.mutate(item.routine_item_id, { onError });
    }
  }

  const busy = markTaken.isPending || undoTaken.isPending;

  return (
    <div className="flex items-center gap-3 py-2">
      <label
        htmlFor={checkboxId}
        className="-mx-2 flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={displayedTaken}
          onChange={handleToggle}
          disabled={busy}
          className="h-5 w-5 cursor-pointer rounded-[var(--radius-sm)] accent-[var(--color-primary)]"
          aria-label={`Mark ${item.supplement_name} as taken`}
        />
      </label>

      <div className={`min-w-0 flex-1 ${displayedTaken ? "opacity-60" : ""}`}>
        <p
          className={`text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] ${
            displayedTaken ? "line-through" : ""
          }`}
        >
          {item.supplement_name}
        </p>
        <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          {formatDose(item.doses, item.serving_unit)}
        </p>
        {error && (
          <p role="alert" className="mt-0.5 text-[length:var(--text-caption)] text-[var(--color-error)]">
            {error}
          </p>
        )}
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={handleToggle} disabled={busy}>
        {displayedTaken ? "Undo" : "Mark taken"}
      </Button>
    </div>
  );
}
