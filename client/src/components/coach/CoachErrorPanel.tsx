import { AlertTriangle, CloudOff, Target, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { EmptyState } from "../ui";

interface CoachErrorPanelProps {
  error: unknown;
}

/**
 * Renders one of the 5 distinct backend failure modes (src/routes/coach.ts,
 * src/middleware/llmRateLimit.ts), matched on error.status + a substring of
 * the real backend message text (see api/coach.ts's doc comment for the
 * exact strings). Falls back to a generic panel for anything unrecognized
 * (e.g. a network failure that never reached the backend).
 */
export function CoachErrorPanel({ error }: CoachErrorPanelProps) {
  if (!(error instanceof ApiError)) {
    return (
      <EmptyState
        icon={<CloudOff size={40} aria-hidden="true" />}
        title="Something went wrong"
        description={error instanceof Error ? error.message : "Please try again."}
      />
    );
  }

  // 422 — no targets set. Reframed: the raw message points at an API
  // endpoint with no UI in this app version, so no CTA pretends to fix it.
  if (error.status === 422 && error.message.includes("No nutrient targets set")) {
    return (
      <EmptyState
        icon={<Target size={40} aria-hidden="true" />}
        title="No targets set yet"
        description="The coach compares your intake against targets, and you don't have any set yet. Target-editing isn't available in the app yet — targets currently have to be set directly via the API."
      />
    );
  }

  // 422 — no logs in the window. This one has a real in-app fix.
  if (error.status === 422 && error.message.includes("No food or supplement logs")) {
    return (
      <EmptyState
        icon={<UtensilsCrossed size={40} aria-hidden="true" />}
        title="No meals logged in this window"
        action={
          <Link
            to="/plan"
            className="text-[length:var(--text-body-sm)] font-medium text-[var(--color-primary)] hover:underline"
          >
            Go log something →
          </Link>
        }
      />
    );
  }

  // 429 — per-minute limit. Transient; the CTA's own cooldown timer (handled
  // by the caller) re-enables it after ~30-60s.
  if (error.status === 429 && error.message.includes("Too many AI requests this minute")) {
    return (
      <EmptyState
        icon={<AlertTriangle size={40} aria-hidden="true" />}
        title="Slow down a little"
        description={error.message}
      />
    );
  }

  // 429 — per-day limit. Message itself states the reset time, so no timer.
  if (error.status === 429 && error.message.includes("Daily AI request limit reached")) {
    return (
      <EmptyState
        icon={<AlertTriangle size={40} aria-hidden="true" />}
        title="Daily limit reached"
        description={error.message}
      />
    );
  }

  // 502 — model failure. Transient upstream issue; immediately retryable.
  if (error.status === 502) {
    return (
      <EmptyState
        icon={<CloudOff size={40} aria-hidden="true" />}
        title="The coach couldn't come up with advice"
        description={error.message}
      />
    );
  }

  return (
    <EmptyState
      icon={<CloudOff size={40} aria-hidden="true" />}
      title="Something went wrong"
      description={error.message}
    />
  );
}
