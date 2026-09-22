import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
