import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  replaceRecipeIngredients,
  updateRecipe,
} from "../api/recipes";
import type { CreateRecipeInput, RecipeIngredientInput, UpdateRecipeInput } from "../api/types";

/** GET /api/recipes has no server-side search — returns the full list; filter client-side. */
export function useRecipes() {
  return useQuery({ queryKey: ["recipes"], queryFn: listRecipes });
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
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });
}
