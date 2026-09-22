import "dotenv/config";
import express from "express";
import { pool } from "./db/pool.js";
import { errorHandler } from "./lib/errors.js";
import { currentUser } from "./middleware/currentUser.js";
import { ingredientsRouter } from "./routes/ingredients.js";
import { mealPlanRecipesRouter, mealPlansRouter } from "./routes/mealPlans.js";
import { nutrientTargetsRouter } from "./routes/nutrientTargets.js";
import { nutritionRouter } from "./routes/nutrition.js";
import { recipesRouter } from "./routes/recipes.js";
import { supplementLogsRouter, supplementsRouter } from "./routes/supplements.js";

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

// TEMPORARY: attributes every request below to the seeded dev user.
// Replaced by real session auth in a later step — see currentUser.ts.
app.use("/api", currentUser);

app.use("/api/ingredients", ingredientsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/meal-plans", mealPlansRouter);
app.use("/api/meal-plan-recipes", mealPlanRecipesRouter);
app.use("/api/nutrient-targets", nutrientTargetsRouter);
app.use("/api/nutrition", nutritionRouter);
app.use("/api/supplements", supplementsRouter);
app.use("/api/supplement-logs", supplementLogsRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`nutrition-tracker listening on http://localhost:${port}`);
});
