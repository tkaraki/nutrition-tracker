import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";

const CLIENT_DIST = path.join(import.meta.dirname, "..", "client", "dist");

// Serves the built Vite frontend in production and falls back to
// index.html for any non-API GET/HEAD request, so client-side routing
// (React Router) works on a hard refresh of e.g. /plan.
//
// Deliberately NOT a route-pattern catch-all (e.g. app.get("*", ...)):
// path-to-regexp v8 (used by Express 5) throws on a bare "*" string route.
// This middleware-function form checks req.path directly instead.
export function serveClient(): express.RequestHandler[] {
  return [
    express.static(CLIENT_DIST, { index: false }),
    (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      res.sendFile(path.join(CLIENT_DIST, "index.html"));
    },
  ];
}
