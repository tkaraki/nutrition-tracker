-- Up Migration
-- pg_trgm has been a "trusted" extension since Postgres 13 — installable by
-- a non-superuser (like nutrition_app) that owns the database, no manual
-- superuser step needed.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Backs similarity() lookups used by /api/recipe-imports to suggest
-- existing ingredients matching a freshly LLM-parsed ingredient name,
-- instead of a full table scan per suggestion.
CREATE INDEX idx_ingredients_name_trgm ON ingredients USING gin (name gin_trgm_ops);

-- Down Migration

DROP INDEX IF EXISTS idx_ingredients_name_trgm;
DROP EXTENSION IF EXISTS pg_trgm;
