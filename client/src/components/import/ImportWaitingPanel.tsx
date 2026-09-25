import { Spinner } from "../ui";

/**
 * Sibling of coach/WaitingPanel.tsx, not an edit to it — same structure and
 * `aria-live="polite"` treatment, copy tuned for the recipe-import call
 * (src/routes/recipeImports.ts) instead of the coach's.
 */
export function ImportWaitingPanel() {
  return (
    <div
      aria-live="polite"
      className="flex flex-col items-center gap-3 text-center py-12 px-6"
    >
      <Spinner size="md" />
      <p className="text-[length:var(--text-body)] text-[var(--color-text)]">
        <span aria-hidden="true">⏳ </span>
        Reading your recipe…
      </p>
      <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
        This can take up to 30 seconds.
      </p>
    </div>
  );
}
