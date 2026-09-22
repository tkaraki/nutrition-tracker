import { useRef, useState } from "react";
import { ApiError } from "../api/client";
import type { CoachAdviceResponse } from "../api/types";
import { CoachErrorPanel } from "../components/coach/CoachErrorPanel";
import { CoachResult } from "../components/coach/CoachResult";
import { WaitingPanel } from "../components/coach/WaitingPanel";
import { Button } from "../components/ui";
import { useCoachAdvice } from "../hooks/useCoach";

const WINDOW_OPTIONS = [3, 7, 14, 30] as const;

// The per-minute rate limit window is 60s; re-enabling somewhere in the
// middle of the 30-60s guidance avoids hammering the limiter right at the
// edge of its own window boundary.
const MINUTE_COOLDOWN_MS = 45_000;

type Displayed =
  | { kind: "success"; data: CoachAdviceResponse }
  | { kind: "error"; error: unknown };

export function CoachRoute() {
  const [windowDays, setWindowDays] = useState<number>(7);
  // Holds the last SETTLED outcome (success or error) so a re-ask keeps the
  // previous result on screen instead of flashing empty while the new
  // request is in flight — TanStack Query mutations reset `data`/`error` to
  // undefined at the start of each new `.mutate()` call, so this can't just
  // read off the mutation object directly.
  const [displayed, setDisplayed] = useState<Displayed | null>(null);
  const [minuteCooldown, setMinuteCooldown] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mutation = useCoachAdvice();

  function handleAsk() {
    mutation.mutate(
      { days: windowDays },
      {
        onSuccess: (data) => {
          setDisplayed({ kind: "success", data });
        },
        onError: (error) => {
          setDisplayed({ kind: "error", error });
          if (error instanceof ApiError && error.status === 429) {
            if (error.message.includes("Too many AI requests this minute")) {
              if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
              setMinuteCooldown(true);
              cooldownTimer.current = setTimeout(() => setMinuteCooldown(false), MINUTE_COOLDOWN_MS);
            } else if (error.message.includes("Daily AI request limit reached")) {
              setDailyLimitReached(true);
            }
          }
        },
      },
    );
  }

  const hasPreviousContent = displayed !== null;
  const ctaDisabled = mutation.isPending || minuteCooldown || dailyLimitReached;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-[length:var(--text-display-sm)] font-semibold text-[var(--color-text)]">
        Coach
      </h1>
      <p className="text-[length:var(--text-body)] text-[var(--color-text-muted)] mt-2">
        Get a read on your nutrition based on what you've logged.
      </p>

      <div className="flex flex-wrap items-center gap-2 mt-6">
        <label htmlFor="coach-window" className="sr-only">
          Time window
        </label>
        <span className="text-[length:var(--text-body-sm)] text-[var(--color-text)]">Last</span>
        <select
          id="coach-window"
          value={windowDays}
          onChange={(e) => setWindowDays(Number(e.target.value))}
          className="min-h-9 bg-[var(--color-surface-alt)] border border-[var(--color-border-strong)] rounded-[var(--radius-sm)] px-2 py-1 text-[length:var(--text-body-sm)] text-[var(--color-text)] focus:outline-none"
        >
          {WINDOW_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      </div>

      <Button
        variant="primary"
        size="lg"
        loading={mutation.isPending}
        disabled={ctaDisabled}
        onClick={handleAsk}
        className="mt-4"
      >
        {hasPreviousContent ? "Ask again" : "Ask the coach"}
      </Button>

      <div className="mt-8">
        {mutation.isPending && !hasPreviousContent && <WaitingPanel days={windowDays} />}
        {displayed?.kind === "success" && <CoachResult data={displayed.data} />}
        {displayed?.kind === "error" && <CoachErrorPanel error={displayed.error} />}
      </div>
    </div>
  );
}
