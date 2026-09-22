import "dotenv/config";
import express from "express";
import { pool } from "./db/pool.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

// Liveness check, and a real round-trip to Postgres so a broken DB
// connection surfaces immediately instead of on the first real request.
app.get("/health", async (_req, res) => {
  try {
    const result = await pool.query<{ now: Date }>("SELECT NOW() AS now");
    res.json({ status: "ok", dbTime: result.rows[0]?.now });
  } catch (err) {
    console.error("Health check DB query failed", err);
    res.status(503).json({ status: "error", message: "database unreachable" });
  }
});

app.listen(port, () => {
  console.log(`nutrition-tracker listening on http://localhost:${port}`);
});
