-- Up Migration
-- daily_nutrient_totals: add ingredients logged directly to a meal slot
-- (food_direct) and switch supplement day attribution from a UTC-derived
-- timestamp to the explicit log_date column added in add-supplement-routine.
-- Output columns and types are unchanged, so CREATE OR REPLACE is safe.

CREATE OR REPLACE VIEW daily_nutrient_totals AS
WITH food AS (
  -- Ingredient nutrients are per 100g (see ingredients table comment).
  -- Grams actually consumed = recipe_ingredients.quantity_g (the full
  -- recipe's yield) scaled by the fraction of the recipe's servings that
  -- were logged eaten: meal_plan_recipes.servings / recipes.servings.
  -- Grouped by meal_plans.plan_date — the day a meal is intentionally
  -- assigned to, independent of the exact eaten_at timestamp.
  SELECT
    mp.user_id,
    mp.plan_date AS day,
    SUM(i.calories_kcal * (ri.quantity_g * mpr.servings / r.servings) / 100) AS calories_kcal,
    SUM(i.protein_g     * (ri.quantity_g * mpr.servings / r.servings) / 100) AS protein_g,
    SUM(i.carbs_g       * (ri.quantity_g * mpr.servings / r.servings) / 100) AS carbs_g,
    SUM(i.fat_g         * (ri.quantity_g * mpr.servings / r.servings) / 100) AS fat_g,
    SUM(i.fiber_g       * (ri.quantity_g * mpr.servings / r.servings) / 100) AS fiber_g,
    SUM(i.sodium_mg      * (ri.quantity_g * mpr.servings / r.servings) / 100) AS sodium_mg,
    SUM(i.potassium_mg   * (ri.quantity_g * mpr.servings / r.servings) / 100) AS potassium_mg,
    SUM(i.calcium_mg     * (ri.quantity_g * mpr.servings / r.servings) / 100) AS calcium_mg,
    SUM(i.iron_mg        * (ri.quantity_g * mpr.servings / r.servings) / 100) AS iron_mg,
    SUM(i.vitamin_c_mg   * (ri.quantity_g * mpr.servings / r.servings) / 100) AS vitamin_c_mg,
    SUM(i.vitamin_d_mcg  * (ri.quantity_g * mpr.servings / r.servings) / 100) AS vitamin_d_mcg
  FROM meal_plan_recipes mpr
  JOIN meal_plans mp        ON mp.id = mpr.meal_plan_id
  JOIN recipes r            ON r.id = mpr.recipe_id
  JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  JOIN ingredients i        ON i.id = ri.ingredient_id
  WHERE mpr.eaten_at IS NOT NULL
  GROUP BY mp.user_id, mp.plan_date
),
food_direct AS (
  -- Ingredients logged straight to a meal slot: same per-100g basis as
  -- `food`, but there's no recipe/servings scaling — quantity_g is the
  -- amount actually eaten.
  SELECT
    mp.user_id,
    mp.plan_date AS day,
    SUM(i.calories_kcal * mpi.quantity_g / 100) AS calories_kcal,
    SUM(i.protein_g     * mpi.quantity_g / 100) AS protein_g,
    SUM(i.carbs_g       * mpi.quantity_g / 100) AS carbs_g,
    SUM(i.fat_g         * mpi.quantity_g / 100) AS fat_g,
    SUM(i.fiber_g       * mpi.quantity_g / 100) AS fiber_g,
    SUM(i.sodium_mg      * mpi.quantity_g / 100) AS sodium_mg,
    SUM(i.potassium_mg   * mpi.quantity_g / 100) AS potassium_mg,
    SUM(i.calcium_mg     * mpi.quantity_g / 100) AS calcium_mg,
    SUM(i.iron_mg        * mpi.quantity_g / 100) AS iron_mg,
    SUM(i.vitamin_c_mg   * mpi.quantity_g / 100) AS vitamin_c_mg,
    SUM(i.vitamin_d_mcg  * mpi.quantity_g / 100) AS vitamin_d_mcg
  FROM meal_plan_ingredients mpi
  JOIN meal_plans mp  ON mp.id = mpi.meal_plan_id
  JOIN ingredients i  ON i.id = mpi.ingredient_id
  WHERE mpi.eaten_at IS NOT NULL
  GROUP BY mp.user_id, mp.plan_date
),
supplement AS (
  -- Supplement nutrients are per single dose; supplement_logs.doses
  -- multiplies directly, no /100 scaling. Day is sl.log_date — the date the
  -- user chose, not a UTC-derived one (was (logged_at AT TIME ZONE 'UTC')::date;
  -- see add-supplement-routine migration).
  SELECT
    sl.user_id,
    sl.log_date AS day,
    SUM(s.calories_kcal * sl.doses) AS calories_kcal,
    SUM(s.protein_g     * sl.doses) AS protein_g,
    SUM(s.carbs_g       * sl.doses) AS carbs_g,
    SUM(s.fat_g         * sl.doses) AS fat_g,
    SUM(s.fiber_g       * sl.doses) AS fiber_g,
    SUM(s.sodium_mg      * sl.doses) AS sodium_mg,
    SUM(s.potassium_mg   * sl.doses) AS potassium_mg,
    SUM(s.calcium_mg     * sl.doses) AS calcium_mg,
    SUM(s.iron_mg        * sl.doses) AS iron_mg,
    SUM(s.vitamin_c_mg   * sl.doses) AS vitamin_c_mg,
    SUM(s.vitamin_d_mcg  * sl.doses) AS vitamin_d_mcg
  FROM supplement_logs sl
  JOIN supplements s ON s.id = sl.supplement_id
  GROUP BY sl.user_id, sl.log_date
),
combined AS (
  SELECT * FROM food
  UNION ALL
  SELECT * FROM food_direct
  UNION ALL
  SELECT * FROM supplement
)
SELECT
  user_id,
  day,
  SUM(calories_kcal)  AS calories_kcal,
  SUM(protein_g)      AS protein_g,
  SUM(carbs_g)        AS carbs_g,
  SUM(fat_g)          AS fat_g,
  SUM(fiber_g)        AS fiber_g,
  SUM(sodium_mg)      AS sodium_mg,
  SUM(potassium_mg)   AS potassium_mg,
  SUM(calcium_mg)     AS calcium_mg,
  SUM(iron_mg)        AS iron_mg,
  SUM(vitamin_c_mg)   AS vitamin_c_mg,
  SUM(vitamin_d_mcg)  AS vitamin_d_mcg
FROM combined
GROUP BY user_id, day;

-- Down Migration
-- Restores the view exactly as defined in
-- add-daily-nutrient-totals-view.sql, before food_direct and log_date
-- existed, so the add-meal-plan-ingredients and add-supplement-routine
-- down migrations can safely drop the table/columns this view would
-- otherwise still reference.

CREATE OR REPLACE VIEW daily_nutrient_totals AS
WITH food AS (
  SELECT
    mp.user_id,
    mp.plan_date AS day,
    SUM(i.calories_kcal * (ri.quantity_g * mpr.servings / r.servings) / 100) AS calories_kcal,
    SUM(i.protein_g     * (ri.quantity_g * mpr.servings / r.servings) / 100) AS protein_g,
    SUM(i.carbs_g       * (ri.quantity_g * mpr.servings / r.servings) / 100) AS carbs_g,
    SUM(i.fat_g         * (ri.quantity_g * mpr.servings / r.servings) / 100) AS fat_g,
    SUM(i.fiber_g       * (ri.quantity_g * mpr.servings / r.servings) / 100) AS fiber_g,
    SUM(i.sodium_mg      * (ri.quantity_g * mpr.servings / r.servings) / 100) AS sodium_mg,
    SUM(i.potassium_mg   * (ri.quantity_g * mpr.servings / r.servings) / 100) AS potassium_mg,
    SUM(i.calcium_mg     * (ri.quantity_g * mpr.servings / r.servings) / 100) AS calcium_mg,
    SUM(i.iron_mg        * (ri.quantity_g * mpr.servings / r.servings) / 100) AS iron_mg,
    SUM(i.vitamin_c_mg   * (ri.quantity_g * mpr.servings / r.servings) / 100) AS vitamin_c_mg,
    SUM(i.vitamin_d_mcg  * (ri.quantity_g * mpr.servings / r.servings) / 100) AS vitamin_d_mcg
  FROM meal_plan_recipes mpr
  JOIN meal_plans mp        ON mp.id = mpr.meal_plan_id
  JOIN recipes r            ON r.id = mpr.recipe_id
  JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  JOIN ingredients i        ON i.id = ri.ingredient_id
  WHERE mpr.eaten_at IS NOT NULL
  GROUP BY mp.user_id, mp.plan_date
),
supplement AS (
  SELECT
    sl.user_id,
    (sl.logged_at AT TIME ZONE 'UTC')::date AS day,
    SUM(s.calories_kcal * sl.doses) AS calories_kcal,
    SUM(s.protein_g     * sl.doses) AS protein_g,
    SUM(s.carbs_g       * sl.doses) AS carbs_g,
    SUM(s.fat_g         * sl.doses) AS fat_g,
    SUM(s.fiber_g       * sl.doses) AS fiber_g,
    SUM(s.sodium_mg      * sl.doses) AS sodium_mg,
    SUM(s.potassium_mg   * sl.doses) AS potassium_mg,
    SUM(s.calcium_mg     * sl.doses) AS calcium_mg,
    SUM(s.iron_mg        * sl.doses) AS iron_mg,
    SUM(s.vitamin_c_mg   * sl.doses) AS vitamin_c_mg,
    SUM(s.vitamin_d_mcg  * sl.doses) AS vitamin_d_mcg
  FROM supplement_logs sl
  JOIN supplements s ON s.id = sl.supplement_id
  GROUP BY sl.user_id, (sl.logged_at AT TIME ZONE 'UTC')::date
),
combined AS (
  SELECT * FROM food
  UNION ALL
  SELECT * FROM supplement
)
SELECT
  user_id,
  day,
  SUM(calories_kcal)  AS calories_kcal,
  SUM(protein_g)      AS protein_g,
  SUM(carbs_g)        AS carbs_g,
  SUM(fat_g)          AS fat_g,
  SUM(fiber_g)        AS fiber_g,
  SUM(sodium_mg)      AS sodium_mg,
  SUM(potassium_mg)   AS potassium_mg,
  SUM(calcium_mg)     AS calcium_mg,
  SUM(iron_mg)        AS iron_mg,
  SUM(vitamin_c_mg)   AS vitamin_c_mg,
  SUM(vitamin_d_mcg)  AS vitamin_d_mcg
FROM combined
GROUP BY user_id, day;
