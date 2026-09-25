import { apiFetch } from "./client";
import type { NutrientKey } from "../lib/nutrients";

/**
 * Ids are BIGSERIAL/BIGINT and every nutrient/dose column is NUMERIC — both
 * arrive as strings on read (src/db/pool.ts's type parser comment) but write
 * endpoints validate z.number(). Coerce on every read here, same convention
 * as api/ingredients.ts and api/mealPlans.ts. `days_of_week` is a
 * SMALLINT[], which node-postgres already returns as plain JS numbers — no
 * coercion needed for it. `log_date` (DATE) and `logged_at`/`created_at`/
 * `updated_at` (TIMESTAMPTZ) are already plain ISO strings.
 */

export type SupplementSlot = "morning" | "midday" | "evening" | "bedtime";

export const SUPPLEMENT_SLOTS: SupplementSlot[] = ["morning", "midday", "evening", "bedtime"];

export const SLOT_LABELS: Record<SupplementSlot, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
  bedtime: "Bedtime",
};

export interface Supplement {
  id: number;
  user_id: number;
  name: string;
  brand: string | null;
  serving_unit: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  extra_micros_json: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export type CreateSupplementInput = {
  name: string;
  brand?: string;
  serving_unit?: string;
  extra_micros_json?: Record<string, number>;
} & Partial<Record<NutrientKey, number>>;

export interface RoutineItem {
  id: number;
  supplement_id: number;
  supplement_name: string;
  serving_unit: string;
  days_of_week: number[];
  doses: number;
  slot: SupplementSlot | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRoutineItemInput {
  supplement_id: number;
  days_of_week: number[];
  doses?: number;
  slot?: SupplementSlot | null;
}

export interface UpdateRoutineItemInput {
  days_of_week?: number[];
  doses?: number;
  slot?: SupplementSlot | null;
}

export interface SupplementLog {
  id: number;
  user_id: number;
  supplement_id: number;
  routine_item_id: number | null;
  doses: number;
  logged_at: string;
  log_date: string;
  supplement_name?: string;
}

export interface RoutineDayItem {
  routine_item_id: number;
  supplement_id: number;
  supplement_name: string;
  serving_unit: string;
  doses: number;
  slot: SupplementSlot | null;
  taken: boolean;
  log: { id: number; doses: number; logged_at: string } | null;
}

export interface RoutineDay {
  date: string;
  scheduled: RoutineDayItem[];
  unscheduled: SupplementLog[];
}

export interface CreateSupplementLogInput {
  supplement_id: number;
  doses?: number;
  log_date?: string;
  logged_at?: string;
}

// ---------------------------------------------------------------------
// Supplements (src/routes/supplements.ts)
// ---------------------------------------------------------------------

interface RawSupplement {
  id: number | string;
  user_id: number | string;
  name: string;
  brand: string | null;
  serving_unit: string;
  calories_kcal: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  fiber_g: number | string;
  sodium_mg: number | string;
  potassium_mg: number | string;
  calcium_mg: number | string;
  iron_mg: number | string;
  vitamin_c_mg: number | string;
  vitamin_d_mcg: number | string;
  extra_micros_json: Record<string, number>;
  created_at: string;
  updated_at: string;
}

function toSupplement(raw: RawSupplement): Supplement {
  return {
    id: Number(raw.id),
    user_id: Number(raw.user_id),
    name: raw.name,
    brand: raw.brand,
    serving_unit: raw.serving_unit,
    calories_kcal: Number(raw.calories_kcal),
    protein_g: Number(raw.protein_g),
    carbs_g: Number(raw.carbs_g),
    fat_g: Number(raw.fat_g),
    fiber_g: Number(raw.fiber_g),
    sodium_mg: Number(raw.sodium_mg),
    potassium_mg: Number(raw.potassium_mg),
    calcium_mg: Number(raw.calcium_mg),
    iron_mg: Number(raw.iron_mg),
    vitamin_c_mg: Number(raw.vitamin_c_mg),
    vitamin_d_mcg: Number(raw.vitamin_d_mcg),
    extra_micros_json: raw.extra_micros_json,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

/** GET /api/supplements — the current user's full supplement list, no server-side search. */
export function listSupplements(): Promise<Supplement[]> {
  return apiFetch<RawSupplement[]>("/api/supplements").then((rows) => rows.map(toSupplement));
}

/** POST /api/supplements — nutrient fields default to 0 server-side if omitted. */
export function createSupplement(input: CreateSupplementInput): Promise<Supplement> {
  return apiFetch<RawSupplement>("/api/supplements", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(toSupplement);
}

/** PATCH /api/supplements/:id — partial update; every field optional. */
export function updateSupplement(id: number, updates: Partial<CreateSupplementInput>): Promise<Supplement> {
  return apiFetch<RawSupplement>(`/api/supplements/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  }).then(toSupplement);
}

/** DELETE /api/supplements/:id — 409 if referenced by any supplement_logs row (ON DELETE RESTRICT). */
export function deleteSupplement(id: number): Promise<void> {
  return apiFetch<void>(`/api/supplements/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------
// Weekly routine (src/routes/supplementRoutine.ts)
// ---------------------------------------------------------------------

interface RawRoutineItem {
  id: number | string;
  supplement_id: number | string;
  supplement_name: string;
  serving_unit: string;
  days_of_week: number[];
  doses: number | string;
  slot: SupplementSlot | null;
  created_at: string;
  updated_at: string;
}

function toRoutineItem(raw: RawRoutineItem): RoutineItem {
  return {
    id: Number(raw.id),
    supplement_id: Number(raw.supplement_id),
    supplement_name: raw.supplement_name,
    serving_unit: raw.serving_unit,
    days_of_week: raw.days_of_week,
    doses: Number(raw.doses),
    slot: raw.slot,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

/** GET /api/supplement-routine — ordered by slot (nulls last), then supplement name. */
export function listRoutineItems(): Promise<RoutineItem[]> {
  return apiFetch<RawRoutineItem[]>("/api/supplement-routine").then((rows) => rows.map(toRoutineItem));
}

/** POST /api/supplement-routine */
export function createRoutineItem(input: CreateRoutineItemInput): Promise<RoutineItem> {
  return apiFetch<RawRoutineItem>("/api/supplement-routine", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(toRoutineItem);
}

/** PATCH /api/supplement-routine/:id — any subset of {days_of_week, doses, slot}. */
export function updateRoutineItem(id: number, updates: UpdateRoutineItemInput): Promise<RoutineItem> {
  return apiFetch<RawRoutineItem>(`/api/supplement-routine/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  }).then(toRoutineItem);
}

/** DELETE /api/supplement-routine/:id — past logs are kept (ON DELETE SET NULL). */
export function deleteRoutineItem(id: number): Promise<void> {
  return apiFetch<void>(`/api/supplement-routine/${id}`, { method: "DELETE" });
}

interface RawRoutineDayItem {
  routine_item_id: number | string;
  supplement_id: number | string;
  supplement_name: string;
  serving_unit: string;
  doses: number | string;
  slot: SupplementSlot | null;
  taken: boolean;
  log: { id: number | string; doses: number | string; logged_at: string } | null;
}

interface RawSupplementLog {
  id: number | string;
  user_id: number | string;
  supplement_id: number | string;
  routine_item_id: number | string | null;
  doses: number | string;
  logged_at: string;
  log_date: string;
  supplement_name?: string;
}

function toSupplementLog(raw: RawSupplementLog): SupplementLog {
  return {
    id: Number(raw.id),
    user_id: Number(raw.user_id),
    supplement_id: Number(raw.supplement_id),
    routine_item_id: raw.routine_item_id === null ? null : Number(raw.routine_item_id),
    doses: Number(raw.doses),
    logged_at: raw.logged_at,
    log_date: raw.log_date,
    ...(raw.supplement_name !== undefined ? { supplement_name: raw.supplement_name } : {}),
  };
}

function toRoutineDayItem(raw: RawRoutineDayItem): RoutineDayItem {
  return {
    routine_item_id: Number(raw.routine_item_id),
    supplement_id: Number(raw.supplement_id),
    supplement_name: raw.supplement_name,
    serving_unit: raw.serving_unit,
    doses: Number(raw.doses),
    slot: raw.slot,
    taken: raw.taken,
    log: raw.log === null ? null : { id: Number(raw.log.id), doses: Number(raw.log.doses), logged_at: raw.log.logged_at },
  };
}

/** GET /api/supplement-routine/day?date=YYYY-MM-DD */
export function getRoutineDay(date: string): Promise<RoutineDay> {
  return apiFetch<{ date: string; scheduled: RawRoutineDayItem[]; unscheduled: RawSupplementLog[] }>(
    `/api/supplement-routine/day?date=${encodeURIComponent(date)}`,
  ).then((raw) => ({
    date: raw.date,
    scheduled: raw.scheduled.map(toRoutineDayItem),
    unscheduled: raw.unscheduled.map(toSupplementLog),
  }));
}

/** PUT /api/supplement-routine/:id/taken/:date — mark a scheduled dose taken (upsert, idempotent). */
export function markRoutineItemTaken(id: number, date: string, doses?: number): Promise<SupplementLog> {
  return apiFetch<RawSupplementLog>(`/api/supplement-routine/${id}/taken/${date}`, {
    method: "PUT",
    body: JSON.stringify(doses !== undefined ? { doses } : {}),
  }).then(toSupplementLog);
}

/** DELETE /api/supplement-routine/:id/taken/:date — undo, idempotent. */
export function undoRoutineItemTaken(id: number, date: string): Promise<void> {
  return apiFetch<void>(`/api/supplement-routine/${id}/taken/${date}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------
// Ad-hoc supplement logs (src/routes/supplements.ts's supplementLogsRouter)
// ---------------------------------------------------------------------

/** POST /api/supplement-logs — an ad-hoc dose, not tied to a routine item. */
export function createSupplementLog(input: CreateSupplementLogInput): Promise<SupplementLog> {
  return apiFetch<RawSupplementLog>("/api/supplement-logs", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(toSupplementLog);
}

/** DELETE /api/supplement-logs/:id — removes an ad-hoc log entry (or a routine-linked one, same as undo). */
export function deleteSupplementLog(id: number): Promise<void> {
  return apiFetch<void>(`/api/supplement-logs/${id}`, { method: "DELETE" });
}
