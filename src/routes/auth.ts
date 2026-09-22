import { Router, type Request } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { validateBody } from "../lib/validate.js";

export const authRouter = Router();

// Shared across register + login: slows brute-force/credential-stuffing
// attempts against endpoints that, on a public repo, an attacker can read
// the exact shape of. 10 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  // NIST 800-63B: length matters more than forced complexity rules
  // (uppercase/digit/symbol requirements are outdated guidance that mostly
  // just pushes people toward predictable substitutions).
  password: z.string().min(10, "must be at least 10 characters"),
  display_name: z.string().trim().min(1),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

/** Promisified session.regenerate — express-session's API is callback-based. */
function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

authRouter.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof registerSchema>;
    const passwordHash = await hashPassword(body.password);

    let userId: number;
    try {
      const result = await pool.query<{ id: number }>(
        `INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id`,
        [body.email, passwordHash, body.display_name],
      );
      userId = result.rows[0]!.id;
    } catch (err) {
      if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
        throw AppError.conflict("Email already registered");
      }
      throw err;
    }

    // Regenerate the session id before establishing the logged-in state,
    // so a session id an attacker set before the user authenticated
    // (session fixation) can't carry over into their authenticated session.
    await regenerateSession(req);
    req.session.userId = userId;
    res.status(201).json({ id: userId, email: body.email, display_name: body.display_name });
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof loginSchema>;
    const result = await pool.query<{ id: number; password_hash: string; display_name: string }>(
      "SELECT id, password_hash, display_name FROM users WHERE email = $1",
      [body.email],
    );
    const user = result.rows[0];

    // Identical error whether the email doesn't exist or the password is
    // wrong — telling them apart would let an attacker enumerate accounts.
    const invalidCredentials = () => new AppError(401, "Invalid email or password");
    if (!user) throw invalidCredentials();

    const passwordOk = await verifyPassword(user.password_hash, body.password);
    if (!passwordOk) throw invalidCredentials();

    await regenerateSession(req);
    req.session.userId = user.id;
    res.json({ id: user.id, email: body.email, display_name: user.display_name });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    res.clearCookie("nutrition_sid");
    res.status(204).send();
  }),
);

// GET /api/auth/me — deliberately doesn't require auth: a frontend needs to
// call this to find out WHETHER a session exists, so it can't itself
// depend on one existing yet.
authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    if (req.session.userId === undefined) {
      res.json({ user: null });
      return;
    }
    const result = await pool.query(
      "SELECT id, email, display_name FROM users WHERE id = $1",
      [req.session.userId],
    );
    res.json({ user: result.rows[0] ?? null });
  }),
);
