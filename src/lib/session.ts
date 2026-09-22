import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db/pool.js";

const PgSession = connectPgSimple(session);

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET is not set. Copy .env.example to .env and fill it in.");
}

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "session",
    createTableIfMissing: false, // table is owned by a migration, not the library
  }),
  name: "nutrition_sid", // don't ship the default 'connect.sid' framework fingerprint
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    // Requires HTTPS in production — Tailscale Funnel terminates TLS in
    // front of this app, so that holds once deployed. False locally so
    // the cookie still gets set over plain http://localhost.
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
});
