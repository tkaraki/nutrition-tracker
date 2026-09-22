import { useQuery } from "@tanstack/react-query";
import { getDailyNutrition, getNutritionRange } from "../api/nutrition";

export function useDailyNutrition(date: string) {
  return useQuery({
    queryKey: ["nutrition", "daily", date],
    queryFn: () => getDailyNutrition(date),
  });
}

export function useNutritionRange(from: string, to: string) {
  return useQuery({
    queryKey: ["nutrition", "range", from, to],
    queryFn: () => getNutritionRange(from, to),
  });
}
