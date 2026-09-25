import { AlertTriangle, CloudOff, Target, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { EmptyState } from "../ui";

interface CoachErrorPanelProps {
  error: unknown;
}

/**
 * Renders one of the 6 distinct backend failure modes (src/routes/coach.ts,
 * src/middleware/llmRateLimit.ts, src/lib/llm/errors.ts), matched on
 * error.status + either a stable error.code or a substring of the real
 * backend message text (see api/coach.ts's doc comment for the exact
 * strings). Falls back to a generic panel for anything unrecognized (e.g. a
 * network failure that never reached the backend).
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

  // 422 — no targets set. This now has a real in-app fix (/targets), same
  // shape as the "no logs" case below.
  if (error.status === 422 && error.message.includes("No nutrient targets set")) {
    return (
      <EmptyState
        icon={<Target size={40} aria-hidden="true" />}
        title="No targets set yet"
        description="The coach compares your intake against targets, and you don't have any set yet."
        action={
          <Link
            to="/targets"
            className="text-[length:var(--text-body-sm)] font-medium text-[var(--color-primary)] hover:underline"
          >
            Set your targets →
          </Link>
        }
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

  // 503 — the upstream provider's own quota is exhausted (Gemini free-tier
  // RESOURCE_EXHAUSTED, not our own llmRateLimit middleware, which stays a
  // 429 above). Calmer copy than a generic failure: this isn't a bug, and
  // retrying immediately won't help — free-tier quotas typically reset daily.
  if (error.status === 503 && error.code === "llm_quota_exhausted") {
    return (
      <EmptyState
        icon={<CloudOff size={40} aria-hidden="true" />}
        title="AI quota used up for now"
        description="The AI provider's free quota is used up for now — try again later (free-tier quotas usually reset daily)."
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
