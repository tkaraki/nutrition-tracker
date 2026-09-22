import { Pool, types } from "pg";

// node-postgres parses SQL DATE (oid 1082) into a JS Date at local midnight,
// which then serializes with a UTC offset — e.g. "2026-09-22" becomes
// "2026-09-22T07:00:00.000Z" in a UTC-7 timezone. For meal-plan dates that
// can shift a day off. Keep DATE as the plain "YYYY-MM-DD" string Postgres
// sends instead of letting the driver turn it into a Date.
types.setTypeParser(types.builtins.DATE, (val: string) => val);

// BIGINT (oid 20) and NUMERIC (oid 1700) are left as their pg-driver
// default: strings, not numbers. BIGINT can exceed JS's safe integer range,
// and NUMERIC as a float risks silent precision loss on nutrient amounts —
// same reasoning as storing money in cents rather than floats. Callers
// convert explicitly where they need to do arithmetic.

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
