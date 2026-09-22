import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";

/**
 * Argon2id — OWASP's current recommendation over bcrypt/PBKDF2 for new
 * applications. @node-rs/argon2 ships prebuilt native binaries per
 * platform (via napi-rs), so `npm install` just fetches the right one —
 * no build toolchain needed on macOS today or the eventual WSL2 host.
 */
export function hashPassword(plain: string): Promise<string> {
  return argon2Hash(plain);
}

export function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  return argon2Verify(passwordHash, plain);
}
