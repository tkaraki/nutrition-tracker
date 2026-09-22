import "dotenv/config";
import { pool } from "./pool.js";

/**
 * TEMPORARY (removed in the auth step): seeds a single local dev user so
 * every table's user_id foreign key has something real to point at before
 * login exists. `password_hash` holds a placeholder, not a real hash — it
 * is never checked against anything until auth is built.
 */
const DEV_USER_EMAIL = "dev@localhost";

async function main() {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, 'unused-until-auth-is-built', 'Dev User')
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [DEV_USER_EMAIL],
  );
  console.log(`Dev user ready: id=${result.rows[0]?.id}, email=${DEV_USER_EMAIL}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
