import type { NextFunction, Request, Response } from "express";
import { pool } from "../db/pool.js";

/**
 * TEMPORARY (removed in the auth step): every request is attributed to the
 * single seeded dev user (see src/db/seed.ts) instead of a real session.
 * There is no login, no per-request identity check, and this file is the
 * one place that changes when real auth replaces it — every route handler
 * below just reads req.userId and stays the same.
 */
const DEV_USER_EMAIL = "dev@localhost";

let cachedDevUserId: number | undefined;

export interface RequestWithUser extends Request {
  userId: number;
}

export async function currentUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (cachedDevUserId === undefined) {
      const result = await pool.query<{ id: number }>("SELECT id FROM users WHERE email = $1", [
        DEV_USER_EMAIL,
      ]);
      const id = result.rows[0]?.id;
      if (id === undefined) {
        throw new Error("Dev user not seeded. Run `npm run seed` first.");
      }
      cachedDevUserId = id;
    }
    (req as RequestWithUser).userId = cachedDevUserId;
    next();
  } catch (err) {
    next(err);
  }
}
