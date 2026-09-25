import { useState } from "react";
import { Button, Card, WeekdayToggle } from "../ui";
import { SLOT_LABELS } from "../../api/supplements";
import type { RoutineItem } from "../../api/supplements";
import { RoutineItemForm } from "./RoutineItemForm";

interface RoutineItemCardProps {
  item: RoutineItem;
  onDelete: (id: number) => void;
  /** Set by the parent when a delete attempt for this row failed. */
  deleteError?: string;
}

export function RoutineItemCard({ item, onDelete, deleteError }: RoutineItemCardProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <RoutineItemForm item={item} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />;
  }

  return (
    <Card padding="sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)]">
            {item.supplement_name}
          </h3>
          <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            {item.slot === null ? "Anytime" : SLOT_LABELS[item.slot]}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-2">
        <WeekdayToggle value={item.days_of_week} onChange={() => {}} readOnly />
      </div>

      <p className="mt-2 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">Dose: {item.doses}</p>

      {deleteError && (
        <p role="alert" className="mt-1 text-[length:var(--text-caption)] text-[var(--color-error)]">
          {deleteError}
        </p>
      )}
    </Card>
  );
}
