import { apiFetch } from "./client";
import type { CoachAdviceResponse } from "./types";

/**
 * POST /api/coach/advice — a real, ~10-30s paid LLM call, never auto-fired.
 *
 * Error handling is deliberately hands-off here: `apiFetch` already throws
 * `ApiError` with the backend's real `.status` and `.message` text on any
 * non-2xx response (see client.ts — it reads `body.error` from the JSON
 * error body, which is exactly what every failure mode below sends). This
 * function does not catch or re-categorize anything; the UI layer branches
 * on `error.status`/`error.message` to show the right copy. For reference,
 * the 5 distinct failure modes (src/routes/coach.ts, src/middleware/llmRateLimit.ts):
 *   - 422 "No nutrient targets set — set at least one via PUT /api/nutrient-targets/:nutrientKey before asking the coach."
 *   - 422 "No food or supplement logs between {from} and {to} — log some meals or doses first."
 *   - 429 "Too many AI requests this minute — wait a bit and try again."
 *   - 429 "Daily AI request limit reached — the free Gemini quota resets at midnight Pacific."
 *   - 502 "The coach model did not return usable advice — try again."
 */
export function getCoachAdvice(days?: number, to?: string): Promise<CoachAdviceResponse> {
  const body: { days?: number; to?: string } = {};
  if (days !== undefined) body.days = days;
  if (to !== undefined) body.to = to;
  return apiFetch<CoachAdviceResponse>("/api/coach/advice", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
