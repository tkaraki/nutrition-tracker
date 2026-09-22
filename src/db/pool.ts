import { Pool } from "pg";

// A single shared connection pool for the app. `DATABASE_URL` is required —
// fail loudly at startup rather than silently connecting to the wrong thing.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

export const pool = new Pool({ connectionString });

pool.on("error", (err: Error) => {
  // Errors on idle clients (e.g. the DB restarting) must not crash the process.
  console.error("Unexpected Postgres pool error", err);
});
