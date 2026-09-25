-- Up Migration
-- Ingredients logged straight to a meal slot, parallel to meal_plan_recipes
-- but without a recipe in between — e.g. "150g banana" doesn't need a
-- single-ingredient recipe created just to be logged.

CREATE TABLE meal_plan_ingredients (
  id             BIGSERIAL PRIMARY KEY,
  meal_plan_id   BIGINT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  ingredient_id  BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  -- Grams of this ingredient, on the ingredients table's per-100g basis
  -- (see that table's comment) — not a servings multiple like recipes.
  quantity_g     NUMERIC(10, 2) NOT NULL CHECK (quantity_g > 0),
  -- Planned vs. eaten, same convention as meal_plan_recipes.eaten_at.
  eaten_at       TIMESTAMPTZ
);
CREATE INDEX idx_meal_plan_ingredients_meal_plan_id ON meal_plan_ingredients(meal_plan_id);
CREATE INDEX idx_meal_plan_ingredients_ingredient_id ON meal_plan_ingredients(ingredient_id);

-- daily_nutrient_totals picks this up via the food_direct CTE added in the
-- update-daily-nutrient-totals-view migration, together with A's change.

-- Down Migration

DROP TABLE IF EXISTS meal_plan_ingredients;
