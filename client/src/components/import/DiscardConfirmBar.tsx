import { Button } from "../ui";

interface DiscardConfirmBarProps {
  onDiscard: () => void;
  onKeepEditing: () => void;
}

/**
 * Lightweight inline confirm (not a full ConfirmDialog modal) — matches the
 * UX spec's "Discard this import?" treatment, which deliberately keeps the
 * review form visible underneath while confirming.
 */
export function DiscardConfirmBar({ onDiscard, onKeepEditing }: DiscardConfirmBarProps) {
  return (
    <div
      role="alertdialog"
      aria-label="Discard this import?"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-warning-border)] bg-[var(--color-warning-wash)] p-3"
    >
      <p className="text-[length:var(--text-body-sm)] text-[var(--color-text)]">
        Discard this import? Your review changes will be lost.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" className="text-[var(--color-error)]" onClick={onDiscard}>
          Discard
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onKeepEditing}>
          Keep editing
        </Button>
      </div>
    </div>
  );
}
