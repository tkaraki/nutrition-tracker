import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { createIngredient, deleteIngredient, getIngredient, listIngredients, updateIngredient } from "../api/ingredients";
import type { CreateIngredientInput } from "../api/types";

export function useIngredients(search?: string) {
  return useQuery({
    queryKey: ["ingredients", search ?? ""],
    queryFn: () => listIngredients(search),
  });
}

export function useIngredient(id: number | undefined) {
  return useQuery({
    queryKey: ["ingredients", "detail", id],
    queryFn: () => getIngredient(id!),
    enabled: id !== undefined,
  });
}

/** Parallel per-id detail fetches, sharing the same cache entries as
 *  `useIngredient`. Used by Library's recipe detail view to compute a full
 *  11-nutrient per-serving breakdown client-side, since GET /api/recipes/:id
 *  only joins 5 of 11 nutrient columns per ingredient line (architecture doc
 *  D flags widening that endpoint as the cheaper fix; until that lands this
 *  mirrors RecipeRow's existing per-recipe extra-fetch pattern, one level
 *  down at the ingredient). */
export function useIngredientsByIds(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["ingredients", "detail", id],
      queryFn: () => getIngredient(id),
    })),
  });
}

export function useCreateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIngredientInput) => createIngredient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    },
  });
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<CreateIngredientInput> }) =>
      updateIngredient(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    },
  });
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteIngredient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    },
  });
}
