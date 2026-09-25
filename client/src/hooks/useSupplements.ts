import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRoutineItem,
  createSupplement,
  createSupplementLog,
  deleteRoutineItem,
  deleteSupplement,
  deleteSupplementLog,
  getRoutineDay,
  listRoutineItems,
  listSupplements,
  markRoutineItemTaken,
  undoRoutineItemTaken,
  updateRoutineItem,
  updateSupplement,
} from "../api/supplements";
import type {
  CreateRoutineItemInput,
  CreateSupplementInput,
  CreateSupplementLogInput,
  UpdateRoutineItemInput,
} from "../api/supplements";

export function useSupplements() {
  return useQuery({
    queryKey: ["supplements"],
    queryFn: listSupplements,
  });
}

/**
 * Shared onSuccess for supplement-list mutations: a supplement's nutrient
 * values feed daily_nutrient_totals live (the view joins the current row,
 * it doesn't snapshot), so editing/deleting one can change past totals too.
 * Also invalidates routine items/day, since both embed the supplement's
 * name and serving_unit via a join.
 */
function useInvalidateSupplements() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["supplements"] });
    queryClient.invalidateQueries({ queryKey: ["supplementRoutine"] });
    queryClient.invalidateQueries({ queryKey: ["supplementRoutineDay"] });
    queryClient.invalidateQueries({ queryKey: ["nutrition"] });
  };
}

export function useCreateSupplement() {
  const invalidate = useInvalidateSupplements();
  return useMutation({
    mutationFn: (input: CreateSupplementInput) => createSupplement(input),
    onSuccess: invalidate,
  });
}

export function useUpdateSupplement() {
  const invalidate = useInvalidateSupplements();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<CreateSupplementInput> }) =>
      updateSupplement(id, updates),
    onSuccess: invalidate,
  });
}

export function useDeleteSupplement() {
  const invalidate = useInvalidateSupplements();
  return useMutation({
    mutationFn: (id: number) => deleteSupplement(id),
    onSuccess: invalidate,
  });
}

export function useRoutineItems() {
  return useQuery({
    queryKey: ["supplementRoutine"],
    queryFn: listRoutineItems,
  });
}

/** Routine-item mutations don't change nutrient totals themselves (only
 * logs do), but they do change what the Today checklist shows. */
function useInvalidateRoutine() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["supplementRoutine"] });
    queryClient.invalidateQueries({ queryKey: ["supplementRoutineDay"] });
  };
}

export function useCreateRoutineItem() {
  const invalidate = useInvalidateRoutine();
  return useMutation({
    mutationFn: (input: CreateRoutineItemInput) => createRoutineItem(input),
    onSuccess: invalidate,
  });
}

export function useUpdateRoutineItem() {
  const invalidate = useInvalidateRoutine();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateRoutineItemInput }) => updateRoutineItem(id, updates),
    onSuccess: invalidate,
  });
}

export function useDeleteRoutineItem() {
  const invalidate = useInvalidateRoutine();
  return useMutation({
    mutationFn: (id: number) => deleteRoutineItem(id),
    onSuccess: invalidate,
  });
}

/** The Today checklist for one date: scheduled routine items (with taken
 * state) plus any ad-hoc logs for that day. */
export function useRoutineDay(date: string) {
  return useQuery({
    queryKey: ["supplementRoutineDay", date],
    queryFn: () => getRoutineDay(date),
  });
}

/** Mark-taken/undo/ad-hoc-log mutations all change daily_nutrient_totals,
 * so they invalidate nutrition alongside the day's own checklist query. */
function useInvalidateRoutineDay(date: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["supplementRoutineDay", date] });
    queryClient.invalidateQueries({ queryKey: ["nutrition"] });
  };
}

export function useMarkRoutineItemTaken(date: string) {
  const invalidate = useInvalidateRoutineDay(date);
  return useMutation({
    mutationFn: (id: number) => markRoutineItemTaken(id, date),
    onSuccess: invalidate,
  });
}

export function useUndoRoutineItemTaken(date: string) {
  const invalidate = useInvalidateRoutineDay(date);
  return useMutation({
    mutationFn: (id: number) => undoRoutineItemTaken(id, date),
    onSuccess: invalidate,
  });
}

export function useCreateSupplementLog(date: string) {
  const invalidate = useInvalidateRoutineDay(date);
  return useMutation({
    mutationFn: (input: CreateSupplementLogInput) => createSupplementLog(input),
    onSuccess: invalidate,
  });
}

export function useDeleteSupplementLog(date: string) {
  const invalidate = useInvalidateRoutineDay(date);
  return useMutation({
    mutationFn: (id: number) => deleteSupplementLog(id),
    onSuccess: invalidate,
  });
}
