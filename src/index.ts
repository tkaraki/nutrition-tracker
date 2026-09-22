import "dotenv/config";
import express from "express";
import { pool } from "./db/pool.js";
import { errorHandler } from "./lib/errors.js";
import { sessionMiddleware } from "./lib/session.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { serveClient } from "./middleware/serveClient.js";
import { authRouter } from "./routes/auth.js";
import { coachRouter } from "./routes/coach.js";
import { ingredientsRouter } from "./routes/ingredients.js";
import { mealPlanRecipesRouter, mealPlansRouter } from "./routes/mealPlans.js";
import { nutrientTargetsRouter } from "./routes/nutrientTargets.js";
import { nutritionRouter } from "./routes/nutrition.js";
import { recipeImportsRouter } from "./routes/recipeImports.js";
import { recipesRouter } from "./routes/recipes.js";
import { supplementLogsRouter, supplementsRouter } from "./routes/supplements.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

// Tailscale Funnel will terminate TLS and forward to this app on the same
// machine, so its X-Forwarded-* headers can be trusted — but only in
// production, where that proxy actually exists. Affects secure cookies and
// req.ip (used by the auth rate limiter).
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json());
app.use(sessionMiddleware);

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

// Public: register/login/logout/me. Mounted before the requireAuth gate
// below, since none of them can require a session that doesn't exist yet.
app.use("/api/auth", authRouter);

// Everything else requires a real, logged-in session.
app.use("/api", requireAuth);

app.use("/api/ingredients", ingredientsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/meal-plans", mealPlansRouter);
app.use("/api/meal-plan-recipes", mealPlanRecipesRouter);
app.use("/api/nutrient-targets", nutrientTargetsRouter);
app.use("/api/nutrition", nutritionRouter);
app.use("/api/supplements", supplementsRouter);
app.use("/api/supplement-logs", supplementLogsRouter);
app.use("/api/recipe-imports", recipeImportsRouter);
app.use("/api/coach", coachRouter);

if (process.env.NODE_ENV === "production") {
  app.use(...serveClient());
}

app.use(errorHandler);

app.listen(port, () => {
  console.log(`nutrition-tracker listening on http://localhost:${port}`);
});
