import { Spinner } from "../ui";

interface WaitingPanelProps {
  /** The window size the pending request is asking about, for the copy. */
  days: number;
}

/**
 * The dedicated pending-state panel for the coach result region — deliberately
 * more than a spinner, since a real ~10-30s LLM call needs to set expectations
 * rather than look stalled. aria-live="polite" so screen reader users get the
 * same "this is working, hang on" signal sighted users get from the copy.
 */
export function WaitingPanel({ days }: WaitingPanelProps) {
  return (
    <div
      aria-live="polite"
      className="flex flex-col items-center gap-3 text-center py-12 px-6"
    >
      <Spinner size="md" />
      <p className="text-[length:var(--text-body)] text-[var(--color-text)]">
        <span aria-hidden="true">⏳ </span>
        Reviewing your last {days} days of logs against your targets…
      </p>
      <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
        This usually takes 10-30 seconds.
      </p>
    </div>
  );
}
