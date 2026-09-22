import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export interface RequestWithUser extends Request {
  userId: number;
}

/**
 * Gates every route mounted after it: requires a valid session with a
 * userId, or fails with 401. This is what src/routes/auth.ts's
 * register/login write into req.session.userId, and what every other
 * route reads back out via RequestWithUser — the one thing that changed
 * when real auth replaced the temporary dev-user stub.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.session.userId;
  if (userId === undefined) {
    next(new AppError(401, "Not authenticated"));
    return;
  }
  (req as RequestWithUser).userId = userId;
  next();
}
