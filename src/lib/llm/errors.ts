/**
 * Thrown when the upstream LLM provider itself rejects a request for
 * quota/rate reasons (e.g. Gemini free-tier RESOURCE_EXHAUSTED / HTTP 429,
 * or an equivalent 429 from a local Ollama setup). Distinct from
 * src/middleware/llmRateLimit.ts, which is our own app-level limiter that
 * fails fast *before* ever reaching the provider and keeps returning its
 * own plain 429 unchanged. This error is mapped to HTTP 503 with a stable
 * `llm_quota_exhausted` code in errors.ts's errorHandler, so the client can
 * show a specific, actionable message instead of a generic failure panel.
 */
export class LlmQuotaExhaustedError extends Error {
  constructor(message = "The AI provider's free-tier quota is exhausted for now — try again later.") {
    super(message);
    this.name = "LlmQuotaExhaustedError";
  }
}
