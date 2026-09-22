import type { NextFunction, Request, RequestHandler } from "express";
import type { ZodType } from "zod";

/**
 * Parses `req.body` against a zod schema and replaces it with the parsed
 * (and type-coerced) result. On failure, throws a ZodError which the
 * central error handler turns into a 400 with field-level details.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

/** Same idea, for query string params. */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next: NextFunction) => {
    // req.query is read-only in newer Express/Node typings; stash the
    // parsed result separately rather than reassigning it.
    (req as Request & { validatedQuery?: T }).validatedQuery = schema.parse(req.query);
    next();
  };
}
