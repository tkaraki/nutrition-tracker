import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { validateBody } from "../lib/validate.js";
import type { RequestWithUser } from "../middleware/requireAuth.js";
import { NUTRIENT_KEYS, nutrientFieldsSchema } from "../lib/nutrients.js";

export const supplementsRouter = Router();
export const supplementLogsRouter = Router();

const createSupplementSchema = z.object({
  name: z.string().trim().min(1),
  brand: z.string().trim().optional(),
  serving_unit: z.string().trim().min(1).default("dose"),
  extra_micros_json: z.record(z.string(), z.number()).default({}),
  ...nutrientFieldsSchema,
});

const updateSupplementSchema = createSupplementSchema.partial();

const ALL_COLUMNS = [
  "name",
  "brand",
  "serving_unit",
  "extra_micros_json",
  ...NUTRIENT_KEYS,
] as const;

// GET /api/supplements — the current user's supplement products
supplementsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query("SELECT * FROM supplements WHERE user_id = $1 ORDER BY name", [
      userId,
    ]);
    res.json(result.rows);
  }),
);

supplementsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query("SELECT * FROM supplements WHERE id = $1 AND user_id = $2", [
      req.params.id,
      userId,
    ]);
    const row = result.rows[0];
    if (!row) throw AppError.notFound("Supplement");
    res.json(row);
  }),
);

supplementsRouter.post(
  "/",
  validateBody(createSupplementSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof createSupplementSchema>;
    const columns = ALL_COLUMNS.filter((c) => body[c] !== undefined);
    const values = columns.map((c) => body[c]);
    const placeholders = columns.map((_, i) => `$${i + 2}`);

    const result = await pool.query(
      `INSERT INTO supplements (user_id, ${columns.join(", ")})
       VALUES ($1, ${placeholders.join(", ")}) RETURNING *`,
      [userId, ...values],
    );
    res.status(201).json(result.rows[0]);
  }),
);

supplementsRouter.patch(
  "/:id",
  validateBody(updateSupplementSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof updateSupplementSchema>;
    const columns = ALL_COLUMNS.filter((c) => body[c] !== undefined);
    if (columns.length === 0) {
      throw new AppError(400, "No fields to update");
    }
    const values = columns.map((c) => body[c]);
    const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(", ");

    const result = await pool.query(
      `UPDATE supplements SET ${setClause}, updated_at = now()
       WHERE id = $${columns.length + 1} AND user_id = $${columns.length + 2} RETURNING *`,
      [...values, req.params.id, userId],
    );
    const row = result.rows[0];
    if (!row) throw AppError.notFound("Supplement");
    res.json(row);
  }),
);

supplementsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query(
      "DELETE FROM supplements WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, userId],
    );
    if (result.rowCount === 0) throw AppError.notFound("Supplement");
    res.status(204).send();
  }),
);

// ---------------------------------------------------------------------
// Supplement logs — the daily-dose entries that feed daily_nutrient_totals
// ---------------------------------------------------------------------

const isoDateTime = z.string().datetime({ offset: true }).optional();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD").optional();

const createLogSchema = z.object({
  supplement_id: z.number().int().positive(),
  doses: z.number().positive().default(1),
  logged_at: isoDateTime, // defaults to now() in SQL when omitted
  // Day attribution the user chose, independent of logged_at's timestamp
  // (see log_date column comment). Defaults to the UTC date of logged_at,
  // which keeps pre-log_date callers behaving the same; the client should
  // always send its own local date. This is the ad-hoc path only —
  // routine_item_id isn't accepted here (see supplementRoutine.ts).
  log_date: isoDate,
});

const updateLogSchema = z.object({
  doses: z.number().positive().optional(),
  logged_at: isoDateTime,
  log_date: isoDate,
});

// GET /api/supplement-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
supplementLogsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const from = typeof req.query.from === "string" ? req.query.from : "0001-01-01";
    const to = typeof req.query.to === "string" ? req.query.to : "9999-12-31";

    const result = await pool.query(
      `SELECT sl.*, s.name AS supplement_name
       FROM supplement_logs sl
       JOIN supplements s ON s.id = sl.supplement_id
       WHERE sl.user_id = $1 AND sl.log_date BETWEEN $2 AND $3
       ORDER BY sl.log_date DESC, sl.logged_at DESC`,
      [userId, from, to],
    );
    res.json(result.rows);
  }),
);

// POST /api/supplement-logs — log an ad-hoc dose taken (not on the routine)
supplementLogsRouter.post(
  "/",
  validateBody(createLogSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof createLogSchema>;

    const owns = await pool.query("SELECT id FROM supplements WHERE id = $1 AND user_id = $2", [
      body.supplement_id,
      userId,
    ]);
    if (owns.rowCount === 0) throw AppError.notFound("Supplement");

    const result = await pool.query(
      `INSERT INTO supplement_logs (user_id, supplement_id, doses, logged_at, log_date)
       VALUES ($1, $2, $3, COALESCE($4, now()), COALESCE($5, (COALESCE($4, now()) AT TIME ZONE 'UTC')::date))
       RETURNING *`,
      [userId, body.supplement_id, body.doses, body.logged_at ?? null, body.log_date ?? null],
    );
    res.status(201).json(result.rows[0]);
  }),
);

// PATCH /api/supplement-logs/:id — correct a mistaken log entry. Moving a
// routine-linked log onto a date that already has a log for that item hits
// uq_supplement_logs_routine_day and surfaces as the usual 409 via the
// existing 23505 mapping.
supplementLogsRouter.patch(
  "/:id",
  validateBody(updateLogSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof updateLogSchema>;
    if (body.doses === undefined && body.logged_at === undefined && body.log_date === undefined) {
      throw new AppError(400, "No fields to update");
    }

    const result = await pool.query(
      `UPDATE supplement_logs
       SET doses = COALESCE($1, doses), logged_at = COALESCE($2, logged_at), log_date = COALESCE($3, log_date)
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [body.doses ?? null, body.logged_at ?? null, body.log_date ?? null, req.params.id, userId],
    );
    const row = result.rows[0];
    if (!row) throw AppError.notFound("Supplement log");
    res.json(row);
  }),
);

supplementLogsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query(
      "DELETE FROM supplement_logs WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, userId],
    );
    if (result.rowCount === 0) throw AppError.notFound("Supplement log");
    res.status(204).send();
  }),
);
