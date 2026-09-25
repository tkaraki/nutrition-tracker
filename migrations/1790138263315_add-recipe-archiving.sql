-- Up Migration
-- Soft-delete for recipes: DELETE /api/recipes/:id can't hard-delete once a
-- recipe is referenced by meal_plan_recipes (ON DELETE RESTRICT), so give it
-- an archive path instead. NULL means active; archived recipes still resolve
-- normally in meal-plan responses and nutrient totals — only list/add are
-- affected (see src/routes/recipes.ts, src/routes/mealPlans.ts).

ALTER TABLE recipes ADD COLUMN archived_at TIMESTAMPTZ;

-- Down Migration

ALTER TABLE recipes DROP COLUMN IF EXISTS archived_at;
