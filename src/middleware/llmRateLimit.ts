import rateLimit from "express-rate-limit";
import type { Request } from "express";
import type { RequestWithUser } from "./requireAuth.js";

// Gemini's free tier caps out around 10 requests/minute and 20/day per
// Google Cloud project (https://ai.google.dev/gemini-api/docs/rate-limits)
// — shared across every LLM-backed route in this app (recipe-imports and
// the coach both draw from the same project), not per user. Google enforces
// the real ceiling regardless, but these fail fast with a clear 429 instead
// of burning a slot on a request that would just get rejected upstream, and
// stop one user (or a retry loop) from silently exhausting the whole day's
// quota for everyone. Apply both limiters to every LLM-backed route so
// they share one pool instead of each route getting its own budget.
function byUser(req: Request): string {
  return String((req as RequestWithUser).userId);
}

export const llmMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8, // stay under Gemini's ~10 RPM free-tier ceiling
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: byUser,
  message: { error: "Too many AI requests this minute — wait a bit and try again." },
});

export const llmDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 15, // stay under Gemini's ~20 RPD free-tier ceiling, leaving headroom
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: byUser,
  message: { error: "Daily AI request limit reached — the free Gemini quota resets at midnight Pacific." },
});
