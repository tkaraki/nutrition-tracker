import { AlertTriangle, CloudOff } from "lucide-react";
import { ApiError } from "../../api/client";
import { EmptyState } from "../ui";

interface ImportErrorPanelProps {
  error: unknown;
  /** Which step-1 mode the failed request was submitted in, for copy that
   *  points at the other mode as a workaround. */
  sourceMode: "url" | "text";
}

/**
 * Sibling of coach/CoachErrorPanel.tsx, not an edit to it — same region-
 * replace/`EmptyState` visual language, matched against the recipe-import
 * pipeline's failure modes (src/routes/recipeImports.ts,
 * src/middleware/llmRateLimit.ts, src/lib/llm/errors.ts) rather than
 * coach.ts's.
 */
export function ImportErrorPanel({ error, sourceMode }: ImportErrorPanelProps) {
  if (!(error instanceof ApiError)) {
    return (
      <EmptyState
        icon={<CloudOff size={40} aria-hidden="true" />}
        title="Something went wrong"
        description={error instanceof Error ? error.message : "Please try again."}
      />
    );
  }

  // 429 — per-minute limit. Transient; the CTA's own cooldown timer (owned
  // by the caller) re-enables it after ~45s.
  if (error.status === 429 && error.message.includes("Too many AI requests this minute")) {
    return (
      <EmptyState
        icon={<AlertTriangle size={40} aria-hidden="true" />}
        title="Slow down a little"
        description={error.message}
      />
    );
  }

  // 429 — per-day limit. Message states the reset time itself, no timer.
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

  // 422 — no readable content on the page (URL mode only), or a generic
  // 502 model failure in either mode. Both transient/immediately retryable;
  // only the copy differs by source mode, per the UX spec.
  if (error.status === 422 || error.status === 502) {
    return (
      <EmptyState
        icon={<CloudOff size={40} aria-hidden="true" />}
        title="Couldn't read that recipe"
        description={
          sourceMode === "url"
            ? "Couldn't read that recipe — try pasting the text instead."
            : "The import didn't return a usable recipe — try again."
        }
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
