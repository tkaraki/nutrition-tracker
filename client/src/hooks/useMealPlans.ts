import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addIngredientToPlan,
  addRecipeToPlan,
  deleteMealPlan,
  listMealPlans,
  removeIngredientFromPlan,
  removeRecipeFromPlan,
  setIngredientEaten,
  setRecipeEaten,
  updateMealPlanIngredient,
  updateMealPlanRecipe,
  upsertMealPlan,
} from "../api/mealPlans";
import type { MealType } from "../api/types";

/** Meal plan slots (with their assigned recipes) over [from, to]. */
export function useMealPlans(from: string, to: string) {
  return useQuery({
    queryKey: ["mealPlans", from, to],
    queryFn: () => listMealPlans(from, to),
  });
}

/** Convenience: meal plan slots for a single day. */
export function useMealPlansForDate(date: string) {
  return useQuery({
    queryKey: ["mealPlans", date, date],
    queryFn: () => listMealPlans(date, date),
  });
}

/**
 * Shared onSuccess for every mutation below: invalidates both meal-plan
 * queries AND nutrition queries. Critical because daily_nutrient_totals
 * only counts rows with eaten_at IS NOT NULL — any mutation that can
 * change eaten state (or which recipes exist at all) must invalidate the
 * nutrition dashboard too, not just the planner's own query.
 */
function useInvalidatePlanAndNutrition() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
    queryClient.invalidateQueries({ queryKey: ["nutrition"] });
  };
}

export function useUpsertMealPlan() {
  const invalidate = useInvalidatePlanAndNutrition();
  return useMutation({
    mutationFn: ({ plan_date, meal_type }: { plan_date: string; meal_type: MealType }) =>
      upsertMealPlan(plan_date, meal_type),
    onSuccess: invalidate,
  });
}

export function useDeleteMealPlan() {
  const invalidate = useInvalidatePlanAndNutrition();
  return useMutation({
    mutationFn: (id: number) => deleteMealPlan(id),
    onSuccess: invalidate,
  });
}

export function useAddRecipeToPlan() {
  const invalidate = useInvalidatePlanAndNutrition();
  return useMutation({
    mutationFn: ({
      mealPlanId,
      recipeId,
      servings,
    }: {
      mealPlanId: number;
      recipeId: number;
      servings?: number;
    }) => addRecipeToPlan(mealPlanId, recipeId, servings),
    onSuccess: invalidate,
  });
}

export function useSetRecipeEaten() {
  const invalidate = useInvalidatePlanAndNutrition();
  return useMutation({
    mutationFn: ({ id, eaten }: { id: number; eaten: boolean }) => setRecipeEaten(id, eaten),
    onSuccess: invalidate,
  });
}

export function useUpdateMealPlanRecipe() {
  const invalidate = useInvalidatePlanAndNutrition();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: { servings?: number; eaten?: boolean } }) =>
      updateMealPlanRecipe(id, updates),
    onSuccess: invalidate,
  });
}

export function useRemoveRecipeFromPlan() {
  const invalidate = useInvalidatePlanAndNutrition();
  return useMutation({
    mutationFn: (id: number) => removeRecipeFromPlan(id),
    onSuccess: invalidate,
  });
}

export function useAddIngredientToPlan() {
  const invalidate = useInvalidatePlanAndNutrition();
  return useMutation({
    mutationFn: ({
      mealPlanId,
      ingredientId,
      quantityG,
      eaten,
    }: {
      mealPlanId: number;
      ingredientId: number;
      quantityG: number;
      eaten?: boolean;
    }) => addIngredientToPlan(mealPlanId, ingredientId, quantityG, eaten),
    onSuccess: invalidate,
  });
}

export function useSetIngredientEaten() {
  const invalidate = useInvalidatePlanAndNutrition();
  return useMutation({
    mutationFn: ({ id, eaten }: { id: number; eaten: boolean }) => setIngredientEaten(id, eaten),
    onSuccess: invalidate,
  });
}

export function useUpdateMealPlanIngredient() {
  const invalidate = useInvalidatePlanAndNutrition();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: { quantity_g?: number; eaten?: boolean } }) =>
      updateMealPlanIngredient(id, updates),
    onSuccess: invalidate,
  });
}

export function useRemoveIngredientFromPlan() {
  const invalidate = useInvalidatePlanAndNutrition();
  return useMutation({
    mutationFn: (id: number) => removeIngredientFromPlan(id),
    onSuccess: invalidate,
  });
}
