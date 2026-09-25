-- Up Migration
-- Supplement weekly routine: a schedule of what to take on which days, plus
-- log_date on supplement_logs so "today" is the date the user chose rather
-- than a UTC-derived timestamp (see daily_nutrient_totals view comment).

CREATE TYPE supplement_slot AS ENUM ('morning', 'midday', 'evening', 'bedtime');

CREATE TABLE supplement_routine_items (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplement_id  BIGINT NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  -- ISO day numbers, 1=Mon..7=Sun. Checked against EXTRACT(ISODOW FROM ...).
  days_of_week   SMALLINT[] NOT NULL,
  doses          NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (doses > 0),
  slot           supplement_slot,              -- NULL = anytime
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(days_of_week) BETWEEN 1 AND 7),
  CHECK (days_of_week <@ ARRAY[1,2,3,4,5,6,7]::smallint[])
);
CREATE INDEX idx_supplement_routine_items_user ON supplement_routine_items(user_id);
-- One item per (supplement, slot), split into two partial indexes rather than
-- a single COALESCE(slot::text, '') expression index: casting a user-defined
-- enum to text isn't IMMUTABLE as far as Postgres's index machinery is
-- concerned, so an expression index on it is rejected at CREATE INDEX time.
CREATE UNIQUE INDEX uq_supplement_routine_items_supp_slot
  ON supplement_routine_items (supplement_id, slot) WHERE slot IS NOT NULL;
CREATE UNIQUE INDEX uq_supplement_routine_items_supp_anytime
  ON supplement_routine_items (supplement_id) WHERE slot IS NULL;

-- ON DELETE CASCADE from supplement to routine item: deleting a supplement is
-- already blocked by supplement_logs' ON DELETE RESTRICT once it has any
-- logs. The cascade only removes a schedule for a product that was never
-- taken.

ALTER TABLE supplement_logs
  ADD COLUMN routine_item_id BIGINT REFERENCES supplement_routine_items(id) ON DELETE SET NULL,
  ADD COLUMN log_date DATE;
UPDATE supplement_logs SET log_date = (logged_at AT TIME ZONE 'UTC')::date;
ALTER TABLE supplement_logs ALTER COLUMN log_date SET NOT NULL;

CREATE UNIQUE INDEX uq_supplement_logs_routine_day
  ON supplement_logs (routine_item_id, log_date) WHERE routine_item_id IS NOT NULL;
CREATE INDEX idx_supplement_logs_user_log_date ON supplement_logs(user_id, log_date);

-- daily_nutrient_totals is switched from logged_at to log_date in the
-- update-daily-nutrient-totals-view migration, together with B's change.

-- Down Migration

DROP INDEX IF EXISTS idx_supplement_logs_user_log_date;
DROP INDEX IF EXISTS uq_supplement_logs_routine_day;
ALTER TABLE supplement_logs DROP COLUMN IF EXISTS log_date, DROP COLUMN IF EXISTS routine_item_id;
DROP TABLE IF EXISTS supplement_routine_items;
DROP TYPE IF EXISTS supplement_slot;
