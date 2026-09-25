import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteNutrientTarget, listNutrientTargets, setNutrientTarget } from "../api/targets";
import type { NutrientKey } from "../lib/nutrients";

export function useNutrientTargets() {
  return useQuery({ queryKey: ["nutrient-targets"], queryFn: listNutrientTargets });
}

/**
 * Shared onSuccess for both mutations below: invalidates the targets list
 * itself plus nutrition queries, since targets feed the Dashboard's
 * progress bars and the Coach's gap analysis.
 */
function useInvalidateTargetsAndNutrition() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["nutrient-targets"] });
    queryClient.invalidateQueries({ queryKey: ["nutrition"] });
  };
}

export function useSetNutrientTarget() {
  const invalidate = useInvalidateTargetsAndNutrition();
  return useMutation({
    mutationFn: ({ key, dailyTarget }: { key: NutrientKey; dailyTarget: number }) =>
      setNutrientTarget(key, dailyTarget),
    onSuccess: invalidate,
  });
}

export function useClearNutrientTarget() {
  const invalidate = useInvalidateTargetsAndNutrition();
  return useMutation({
    mutationFn: (key: NutrientKey) => deleteNutrientTarget(key),
    onSuccess: invalidate,
  });
}
