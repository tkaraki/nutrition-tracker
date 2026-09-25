const DAYS: { iso: number; short: string; full: string }[] = [
  { iso: 1, short: "M", full: "Monday" },
  { iso: 2, short: "T", full: "Tuesday" },
  { iso: 3, short: "W", full: "Wednesday" },
  { iso: 4, short: "T", full: "Thursday" },
  { iso: 5, short: "F", full: "Friday" },
  { iso: 6, short: "S", full: "Saturday" },
  { iso: 7, short: "S", full: "Sunday" },
];

interface WeekdayToggleProps {
  label?: string;
  value: number[];
  onChange: (days: number[]) => void;
  disabled?: boolean;
  error?: string;
  /** Read-only display mode (Routine list's dots) vs interactive multi-select buttons (Routine form). */
  readOnly?: boolean;
}

/** Multi-select ISO weekday picker (1=Mon..7=Sun). Interactive buttons use
 * aria-pressed; read-only mode renders the same shape as static dots, each
 * with an accessible name ("Monday, scheduled" / "Tuesday, not scheduled") —
 * never color-only, matching the dashboard 7-day-strip convention. */
export function WeekdayToggle({
  label = "Days of week",
  value,
  onChange,
  disabled = false,
  error,
  readOnly = false,
}: WeekdayToggleProps) {
  function toggle(iso: number) {
    if (value.includes(iso)) {
      onChange(value.filter((d) => d !== iso));
    } else {
      onChange([...value, iso].sort((a, b) => a - b));
    }
  }

  return (
    <div>
      {label && (
        <span className="block text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] mb-1">
          {label}
        </span>
      )}
      <div className="flex gap-1.5" role={readOnly ? undefined : "group"} aria-label={readOnly ? undefined : label}>
        {DAYS.map(({ iso, short, full }) => {
          const scheduled = value.includes(iso);
          if (readOnly) {
            return (
              <span
                key={iso}
                title={`${full}, ${scheduled ? "scheduled" : "not scheduled"}`}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-full)] text-[length:var(--text-caption)] font-semibold ${
                  scheduled
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                    : "border border-dashed border-[var(--color-border-strong)] text-[var(--color-text-subtle)]"
                }`}
              >
                <span aria-hidden="true">{short}</span>
                <span className="sr-only">
                  {full}, {scheduled ? "scheduled" : "not scheduled"}
                </span>
              </span>
            );
          }
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-pressed={scheduled}
              onClick={() => toggle(iso)}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] border text-[length:var(--text-body-sm)] font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                scheduled
                  ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                  : "bg-transparent border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"
              }`}
            >
              <span aria-hidden="true">{short}</span>
              <span className="sr-only">{full}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-[length:var(--text-caption)] text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
