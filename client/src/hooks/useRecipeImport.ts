import { useMutation } from "@tanstack/react-query";
import { postRecipeImport } from "../api/recipeImports";
import type { RecipeImportInput } from "../api/recipeImports";

/**
 * useMutation, deliberately NOT useQuery — same rationale as useCoachAdvice:
 * this triggers a real ~10-30s LLM call and must only fire on explicit
 * user action (submitting step 1), never automatically.
 */
export function useRecipeImport() {
  return useMutation({
    mutationFn: (input: RecipeImportInput) => postRecipeImport(input),
  });
}
