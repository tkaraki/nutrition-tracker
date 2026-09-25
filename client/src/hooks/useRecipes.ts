import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  replaceRecipeIngredients,
  setRecipeArchived,
  updateRecipe,
} from "../api/recipes";
import type { CreateRecipeInput, RecipeIngredientInput, UpdateRecipeInput } from "../api/types";

/** GET /api/recipes has no server-side search — returns the full list;
 *  filter client-side. Defaults to active-only (matches original behavior
 *  every existing caller, e.g. Planner's RecipePicker, relies on); pass
 *  `true` for Library's "Show archived" toggle. */
export function useRecipes(includeArchived = false) {
  return useQuery({
    queryKey: ["recipes", includeArchived ? "all" : "active"],
    queryFn: () => listRecipes(includeArchived),
  });
}

export function useRecipe(id: number | undefined) {
  return useQuery({
    queryKey: ["recipes", id],
    queryFn: () => getRecipe(id!),
    enabled: id !== undefined,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecipeInput) => createRecipe(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateRecipeInput }) => updateRecipe(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      // Totals scale by the recipe's servings live, so a servings edit changes logged history.
      queryClient.invalidateQueries({ queryKey: ["nutrition"] });
    },
  });
}

export function useReplaceRecipeIngredients() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ingredients }: { id: number; ingredients: RecipeIngredientInput[] }) =>
      replaceRecipeIngredients(id, ingredients),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["recipes", id] });
      queryClient.invalidateQueries({ queryKey: ["nutrition"] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["nutrition"] });
    },
  });
}

/** PATCH /api/recipes/:id {archived} — restore (archived:false, Library's
 *  "Restore" action) or re-archive (archived:true) an item. */
export function useSetRecipeArchived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) => setRecipeArchived(id, archived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}
