import { apiFetch } from "./client";
import type { Me, User } from "./types";

/**
 * src/routes/auth.ts's register/login handlers return `id` straight from a
 * `RETURNING id` query on a BIGSERIAL column via `pool.query<{ id: number }>` —
 * the *type* annotation says number, but node-postgres still sends BIGINT
 * over the wire as a string (see src/db/pool.ts's type parser comment), so
 * coerce here for consistency with every other id in the app.
 */
function toUser(raw: { id: number | string; email: string; display_name: string }): User {
  return { id: Number(raw.id), email: raw.email, display_name: raw.display_name };
}

export function register(email: string, password: string, display_name: string): Promise<User> {
  return apiFetch<{ id: number | string; email: string; display_name: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, display_name }),
  }).then(toUser);
}

export function login(email: string, password: string): Promise<User> {
  return apiFetch<{ id: number | string; email: string; display_name: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then(toUser);
}

export function logout(): Promise<void> {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}

export function getMe(): Promise<Me> {
  return apiFetch<{ user: { id: number | string; email: string; display_name: string } | null }>(
    "/api/auth/me",
  ).then((raw) => ({ user: raw.user ? toUser(raw.user) : null }));
}
