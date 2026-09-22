import { useMutation } from "@tanstack/react-query";
import { getCoachAdvice } from "../api/coach";

/**
 * useMutation, deliberately NOT useQuery — this triggers a real ~10-30s
 * paid LLM call and must only fire on explicit user action, never
 * automatically on mount/navigation/refetch.
 */
export function useCoachAdvice() {
  return useMutation({
    mutationFn: ({ days, to }: { days?: number; to?: string } = {}) => getCoachAdvice(days, to),
  });
}
