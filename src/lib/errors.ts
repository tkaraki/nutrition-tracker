import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

/**
 * A known, expected error with an HTTP status attached — thrown deliberately
 * from route handlers (e.g. "not found", "already exists"). Anything that
 * isn't an AppError is treated as a bug and returns a generic 500, so
 * internals never leak to the client.
 */
export class AppError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }

  static notFound(what: string): AppError {
    return new AppError(404, `${what} not found`);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(409, message, details);
  }
}

/** Narrow shape for the node-postgres error fields we actually inspect. */
interface PgError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
}

function isPgError(err: unknown): err is PgError {
  return err instanceof Error && "code" in err;
}

/**
 * Wraps an async route handler so a rejected promise reaches Express's error
 * pipeline instead of becoming an unhandled rejection. Express 4 doesn't do
 * this automatically for async functions.
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as Req, res, next).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express requires 4-arity to recognize an error handler
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: err.flatten() });
    return;
  }

  if (isPgError(err)) {
    // https://www.postgresql.org/docs/current/errcodes-appendix.html
    if (err.code === "23505") {
      res.status(409).json({ error: "Already exists", details: err.detail });
      return;
    }
    if (err.code === "23503") {
      res.status(409).json({ error: "Referenced by another record", details: err.detail });
      return;
    }
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
