import { Button, Field } from "../ui";
import { NUTRIENT_DISPLAY, type NutrientKey } from "../../lib/nutrients";

export interface RowSaveStatus {
  state: "idle" | "saving" | "saved" | "error";
  message?: string;
}

interface TargetRowProps {
  nutrientKey: NutrientKey;
  value: string;
  validationError?: string;
  status: RowSaveStatus;
  onChange: (value: string) => void;
  onBlur: () => void;
  onClear: () => void;
  onRetry: () => void;
}

/** One nutrient's target row: input + per-row "Clear" (blanks the field,
 *  doesn't fire DELETE until the page-level "Save changes") + per-row
 *  save/error status. See TargetsRoute for the batch save/diff logic. */
export function TargetRow({
  nutrientKey,
  value,
  validationError,
  status,
  onChange,
  onBlur,
  onClear,
  onRetry,
}: TargetRowProps) {
  const meta = NUTRIENT_DISPLAY[nutrientKey];
  const isEmpty = value.trim() === "";

  return (
    <div className="flex items-start gap-2 py-2">
      <div className="flex-1">
        <Field
          label={`${meta.label} (${meta.unit})`}
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          error={validationError}
        />
        {!validationError && isEmpty && (
          <p className="mt-1 text-[length:var(--text-caption)] text-[var(--color-text-subtle)]">no target set</p>
        )}
        {!validationError && status.state === "saved" && (
          <p role="status" className="mt-1 text-[length:var(--text-caption)] text-[var(--color-success)]">
            Saved
          </p>
        )}
        {!validationError && status.state === "error" && (
          <p
            role="alert"
            className="mt-1 flex items-center gap-2 text-[length:var(--text-caption)] text-[var(--color-error)]"
          >
            {status.message ?? "Couldn't save — try again"}
            <button type="button" onClick={onRetry} className="font-medium underline">
              Retry
            </button>
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-6"
        onClick={onClear}
        disabled={isEmpty}
        aria-label={`Clear ${meta.label} target`}
      >
        Clear
      </Button>
    </div>
  );
}
