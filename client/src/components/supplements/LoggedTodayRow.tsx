import { useState } from "react";
import { Button } from "../ui";
import { useDeleteSupplementLog } from "../../hooks/useSupplements";
import { formatDose, formatLogTime } from "./format";
import type { Supplement, SupplementLog } from "../../api/supplements";

interface LoggedTodayRowProps {
  log: SupplementLog;
  date: string;
  /** Only needed to resolve the log's serving_unit for display — the log
   * itself doesn't carry one (unlike a RoutineDayItem, which is pre-joined). */
  supplement: Supplement | undefined;
}

/** An ad-hoc (unscheduled) dose logged for the day — no checkbox, since it's
 * already logged; "Remove" undoes it, no confirmation (same reasoning as the
 * routine rows' undo: there's no hidden side effect to warn about). */
export function LoggedTodayRow({ log, date, supplement }: LoggedTodayRowProps) {
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteLog = useDeleteSupplementLog(date);

  function handleRemove() {
    setRemoved(true);
    setError(null);
    deleteLog.mutate(log.id, {
      onError: () => {
        setRemoved(false);
        setError("Couldn't remove — try again");
      },
    });
  }

  if (removed && !error) return null;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)]">
          {log.supplement_name ?? supplement?.name ?? "Supplement"}
        </p>
        <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          {formatDose(log.doses, supplement?.serving_unit ?? "dose")}
          <span className="ml-2 text-[length:var(--text-caption)] text-[var(--color-text-subtle)]">
            {formatLogTime(log.logged_at)}
          </span>
        </p>
        {error && (
          <p role="alert" className="mt-0.5 text-[length:var(--text-caption)] text-[var(--color-error)]">
            {error}
          </p>
        )}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={deleteLog.isPending}>
        Remove
      </Button>
    </div>
  );
}
