import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError, asyncHandler } from "../lib/errors.js";
import { validateBody, validateQuery } from "../lib/validate.js";
import type { RequestWithUser } from "../middleware/requireAuth.js";

export const supplementRoutineRouter = Router();

const SLOTS = ["morning", "midday", "evening", "bedtime"] as const;
const slotSchema = z.enum(SLOTS).nullable();

// 1–7 entries, deduped and sorted, each an ISO day number (1=Mon..7=Sun) —
// matches the days_of_week CHECK constraints on supplement_routine_items.
const daysOfWeekSchema = z
  .array(z.number().int().min(1).max(7))
  .min(1)
  .max(7)
  .transform((days) => [...new Set(days)].sort((a, b) => a - b));

const createRoutineItemSchema = z.object({
  supplement_id: z.number().int().positive(),
  days_of_week: daysOfWeekSchema,
  doses: z.number().positive().default(1),
  slot: slotSchema.default(null),
});

const updateRoutineItemSchema = z.object({
  days_of_week: daysOfWeekSchema.optional(),
  doses: z.number().positive().optional(),
  slot: slotSchema.optional(),
});

const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const dayQuerySchema = z.object({ date: dateParam });
const markTakenBodySchema = z.preprocess(
  (val) => val ?? {},
  z.object({ doses: z.number().positive().optional() }),
);

/** ISO day-of-week (1=Mon..7=Sun) for a YYYY-MM-DD date, computed in UTC so
 * it matches Postgres's EXTRACT(ISODOW FROM date) regardless of server tz. */
function isoDow(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
  return day === 0 ? 7 : day;
}

const ROUTINE_ITEM_SELECT = `
  SELECT ri.id, ri.supplement_id, s.name AS supplement_name, s.serving_unit,
         ri.days_of_week, ri.doses, ri.slot, ri.created_at, ri.updated_at
  FROM supplement_routine_items ri
  JOIN supplements s ON s.id = ri.supplement_id
`;

// GET /api/supplement-routine — the current user's full schedule
supplementRoutineRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query(
      `${ROUTINE_ITEM_SELECT} WHERE ri.user_id = $1 ORDER BY ri.slot NULLS LAST, s.name`,
      [userId],
    );
    res.json(result.rows);
  }),
);

// POST /api/supplement-routine — add a supplement to the weekly schedule
supplementRoutineRouter.post(
  "/",
  validateBody(createRoutineItemSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof createRoutineItemSchema>;

    const owns = await pool.query("SELECT id FROM supplements WHERE id = $1 AND user_id = $2", [
      body.supplement_id,
      userId,
    ]);
    if (owns.rowCount === 0) throw AppError.notFound("Supplement");

    const inserted = await pool.query(
      `INSERT INTO supplement_routine_items (user_id, supplement_id, days_of_week, doses, slot)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, body.supplement_id, body.days_of_week, body.doses, body.slot],
    );
    // Re-select through the same join as GET/PATCH so the response shape
    // (with supplement_name, serving_unit) is identical everywhere.
    const result = await pool.query(`${ROUTINE_ITEM_SELECT} WHERE ri.id = $1`, [inserted.rows[0].id]);
    res.status(201).json(result.rows[0]);
  }),
);

// PATCH /api/supplement-routine/:id — update any subset of the schedule
supplementRoutineRouter.patch(
  "/:id",
  validateBody(updateRoutineItemSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const body = req.body as z.infer<typeof updateRoutineItemSchema>;
    if (body.days_of_week === undefined && body.doses === undefined && body.slot === undefined) {
      throw new AppError(400, "No fields to update");
    }

    const updated = await pool.query(
      `UPDATE supplement_routine_items
       SET days_of_week = COALESCE($1, days_of_week),
           doses = COALESCE($2, doses),
           slot = CASE WHEN $3::boolean THEN $4::supplement_slot ELSE slot END,
           updated_at = now()
       WHERE id = $5 AND user_id = $6
       RETURNING id`,
      [
        body.days_of_week ?? null,
        body.doses ?? null,
        "slot" in body, // whether slot was sent at all (distinguishes null from omitted)
        body.slot ?? null,
        req.params.id,
        userId,
      ],
    );
    const row = updated.rows[0];
    if (!row) throw AppError.notFound("Supplement routine item");

    const result = await pool.query(`${ROUTINE_ITEM_SELECT} WHERE ri.id = $1`, [row.id]);
    res.json(result.rows[0]);
  }),
);

supplementRoutineRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const result = await pool.query(
      "DELETE FROM supplement_routine_items WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, userId],
    );
    if (result.rowCount === 0) throw AppError.notFound("Supplement routine item");
    res.status(204).send();
  }),
);

// GET /api/supplement-routine/day?date=YYYY-MM-DD — today's (or any day's)
// checklist: every routine item scheduled for that weekday, whether it's
// been marked taken, plus any ad-hoc (non-routine) logs for the same day.
// No GET /:id exists on this router, so there's no collision risk with this
// literal "/day" path, unlike PATCH/DELETE "/:id" above.
supplementRoutineRouter.get(
  "/day",
  validateQuery(dayQuerySchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const { date } = (req as unknown as { validatedQuery: z.infer<typeof dayQuerySchema> }).validatedQuery;

    const [scheduledResult, unscheduledResult] = await Promise.all([
      pool.query(
        `SELECT ri.id AS routine_item_id, ri.supplement_id, s.name AS supplement_name,
                s.serving_unit, ri.doses, ri.slot,
                sl.id AS log_id, sl.doses AS log_doses, sl.logged_at AS log_logged_at
         FROM supplement_routine_items ri
         JOIN supplements s ON s.id = ri.supplement_id
         LEFT JOIN supplement_logs sl ON sl.routine_item_id = ri.id AND sl.log_date = $2
         WHERE ri.user_id = $1 AND EXTRACT(ISODOW FROM $2::date)::int = ANY(ri.days_of_week)
         ORDER BY ri.slot NULLS LAST, s.name`,
        [userId, date],
      ),
      pool.query(
        `SELECT sl.*, s.name AS supplement_name
         FROM supplement_logs sl
         JOIN supplements s ON s.id = sl.supplement_id
         WHERE sl.user_id = $1 AND sl.log_date = $2 AND sl.routine_item_id IS NULL
         ORDER BY sl.logged_at`,
        [userId, date],
      ),
    ]);

    res.json({
      date,
      scheduled: scheduledResult.rows.map((r) => ({
        routine_item_id: r.routine_item_id,
        supplement_id: r.supplement_id,
        supplement_name: r.supplement_name,
        serving_unit: r.serving_unit,
        doses: r.doses,
        slot: r.slot,
        taken: r.log_id !== null,
        log: r.log_id === null ? null : { id: r.log_id, doses: r.log_doses, logged_at: r.log_logged_at },
      })),
      unscheduled: unscheduledResult.rows,
    });
  }),
);

// PUT /api/supplement-routine/:id/taken/:date — mark today's (or any day's)
// dose taken. Upsert on (routine_item_id, log_date), so a repeat call is a
// no-op update that still returns the row — same idempotency trick
// POST /meal-plans uses for its (user_id, plan_date, meal_type) upsert.
supplementRoutineRouter.put(
  "/:id/taken/:date",
  validateBody(markTakenBodySchema),
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const date = dateParam.parse(req.params.date);
    const body = req.body as z.infer<typeof markTakenBodySchema>;

    const item = await pool.query(
      "SELECT id, days_of_week FROM supplement_routine_items WHERE id = $1 AND user_id = $2",
      [req.params.id, userId],
    );
    const row = item.rows[0];
    if (!row) throw AppError.notFound("Supplement routine item");

    if (!row.days_of_week.includes(isoDow(date))) {
      throw new AppError(422, "Not scheduled on that day");
    }

    const result = await pool.query(
      `INSERT INTO supplement_logs (user_id, supplement_id, routine_item_id, doses, log_date)
       SELECT ri.user_id, ri.supplement_id, ri.id, COALESCE($3, ri.doses), $2
       FROM supplement_routine_items ri WHERE ri.id = $1 AND ri.user_id = $4
       ON CONFLICT (routine_item_id, log_date) WHERE routine_item_id IS NOT NULL
       DO UPDATE SET doses = COALESCE($3, supplement_logs.doses)
       RETURNING *`,
      [req.params.id, date, body.doses ?? null, userId],
    );
    res.json(result.rows[0]);
  }),
);

// DELETE /api/supplement-routine/:id/taken/:date — undo. Idempotent: 204
// whether or not a log existed for that day, since the end state either way
// is "not taken".
supplementRoutineRouter.delete(
  "/:id/taken/:date",
  asyncHandler(async (req, res) => {
    const { userId } = req as RequestWithUser;
    const date = dateParam.parse(req.params.date);

    const owns = await pool.query(
      "SELECT id FROM supplement_routine_items WHERE id = $1 AND user_id = $2",
      [req.params.id, userId],
    );
    if (owns.rowCount === 0) throw AppError.notFound("Supplement routine item");

    await pool.query(
      "DELETE FROM supplement_logs WHERE routine_item_id = $1 AND log_date = $2 AND user_id = $3",
      [req.params.id, date, userId],
    );
    res.status(204).send();
  }),
);
