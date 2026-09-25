export class ApiError extends Error {
  status: number;
  details?: unknown;
  /** Stable machine-readable code, when the backend sends one (e.g.
   *  "llm_quota_exhausted") — for branching that shouldn't depend on
   *  matching the human-readable message text. */
  code?: string;
  constructor(status: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;
    const code =
      body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : undefined;
    throw new ApiError(
      res.status,
      message,
      body && typeof body === "object" ? (body as { details?: unknown }).details : undefined,
      code,
    );
  }
  return body as T;
}
