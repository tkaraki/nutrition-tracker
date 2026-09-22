-- Up Migration
-- Core schema: users, ingredients, recipes, meal planning, supplements.
-- Aggregation (daily_nutrient_totals) is deliberately deferred to a later
-- migration once the underlying tables are proven out (build-order step 3).

-- ---------------------------------------------------------------------
-- Users & personal targets
-- ---------------------------------------------------------------------

CREATE TABLE users (
  id             BIGSERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per user per nutrient target (protein, fiber, calories, ...).
-- Modeled as rows rather than fixed columns so new nutrients can be
-- targeted later without a schema change.
CREATE TABLE nutrient_targets (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nutrient_key   TEXT NOT NULL,        -- e.g. 'protein_g', 'fiber_g', 'calories_kcal'
  daily_target   NUMERIC(10, 2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, nutrient_key)
);

-- ---------------------------------------------------------------------
-- Ingredients & nutrition data (normalized, sourced from USDA FDC)
-- ---------------------------------------------------------------------

CREATE TABLE ingredients (
  id                BIGSERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  fdc_id            INTEGER UNIQUE,     -- USDA FoodData Central id, when sourced from there
  serving_size_g    NUMERIC(10, 2),     -- reference serving size this row's values are per
  calories_kcal     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  protein_g         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  carbs_g           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fat_g             NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fiber_g           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  -- Key micronutrients as explicit columns (fast, simple queries for the
  -- common case). Anything beyond this set can go in extra_micros_json.
  sodium_mg         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  potassium_mg      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  calcium_mg        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  iron_mg           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  vitamin_c_mg      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  vitamin_d_mcg     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  extra_micros_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingredients_name ON ingredients USING gin (to_tsvector('english', name));

-- ---------------------------------------------------------------------
-- Recipes
-- ---------------------------------------------------------------------

CREATE TABLE recipes (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  instructions TEXT,
  source_url   TEXT,                 -- set when parsed from a URL via the LLM pipeline
  servings     NUMERIC(10, 2) NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);

CREATE TABLE recipe_ingredients (
  id            BIGSERIAL PRIMARY KEY,
  recipe_id     BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity_g    NUMERIC(10, 2) NOT NULL,   -- normalized to grams for consistent aggregation
  note          TEXT,                       -- e.g. "diced", "or substitute with..."
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- ---------------------------------------------------------------------
-- Meal planning: assigning recipes to days/meal types, and what was eaten
-- ---------------------------------------------------------------------

CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

CREATE TABLE meal_plans (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date  DATE NOT NULL,
  meal_type  meal_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date, meal_type)
);

CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, plan_date);

CREATE TABLE meal_plan_recipes (
  id            BIGSERIAL PRIMARY KEY,
  meal_plan_id  BIGINT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  recipe_id     BIGINT NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  servings      NUMERIC(10, 2) NOT NULL DEFAULT 1,
  -- Planning vs. reality: a row is "eaten" once the user confirms it, with
  -- its own timestamp so planned-but-skipped meals are distinguishable
  -- from actually-logged ones in the nutrient totals.
  eaten_at      TIMESTAMPTZ
);

CREATE INDEX idx_meal_plan_recipes_meal_plan_id ON meal_plan_recipes(meal_plan_id);
CREATE INDEX idx_meal_plan_recipes_recipe_id ON meal_plan_recipes(recipe_id);

-- ---------------------------------------------------------------------
-- Supplements: products + daily logs, unified into the same pipeline
-- ---------------------------------------------------------------------

CREATE TABLE supplements (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  brand             TEXT,
  -- Nutrient content is expressed per single dose (one pill/scoop/etc.),
  -- mirroring ingredients' per-serving shape so both feed the same
  -- aggregation logic downstream.
  serving_unit      TEXT NOT NULL DEFAULT 'dose',
  calories_kcal     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  protein_g         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  carbs_g           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fat_g             NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fiber_g           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sodium_mg         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  potassium_mg      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  calcium_mg        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  iron_mg           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  vitamin_c_mg      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  vitamin_d_mcg     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  extra_micros_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplements_user_id ON supplements(user_id);

CREATE TABLE supplement_logs (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplement_id  BIGINT NOT NULL REFERENCES supplements(id) ON DELETE RESTRICT,
  doses          NUMERIC(10, 2) NOT NULL DEFAULT 1,
  logged_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplement_logs_user_logged_at ON supplement_logs(user_id, logged_at);
CREATE INDEX idx_supplement_logs_supplement_id ON supplement_logs(supplement_id);

-- Down Migration

DROP TABLE IF EXISTS supplement_logs;
DROP TABLE IF EXISTS supplements;
DROP TABLE IF EXISTS meal_plan_recipes;
DROP TABLE IF EXISTS meal_plans;
DROP TYPE IF EXISTS meal_type;
DROP TABLE IF EXISTS recipe_ingredients;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS nutrient_targets;
DROP TABLE IF EXISTS users;
