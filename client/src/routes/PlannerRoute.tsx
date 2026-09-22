import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MealSection } from "../components/planner/MealSection";
import { useMealPlansForDate } from "../hooks/useMealPlans";
import { addDays, formatDisplayDate, localToday } from "../lib/dates";
import { Spinner } from "../components/ui";
import type { MealPlan, MealType } from "../api/types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MONTH_DAY_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/** "Sep 22" for a "YYYY-MM-DD" string, parsed as a local date (not UTC). */
function monthDayLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return MONTH_DAY_FORMAT.format(new Date(year!, month! - 1, day!));
}

const RELATIVE_LABELS = new Set(["Today", "Yesterday", "Tomorrow"]);

export function PlannerRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date") ?? localToday();
  const isToday = date === localToday();

  function goToDate(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === localToday()) {
          params.delete("date");
        } else {
          params.set("date", next);
        }
        return params;
      },
      { replace: false },
    );
  }

  const relativeLabel = formatDisplayDate(date);
  const heading = RELATIVE_LABELS.has(relativeLabel) ? `${relativeLabel}, ${monthDayLabel(date)}` : relativeLabel;

  const { data: mealPlans, isPending, error } = useMealPlansForDate(date);

  const plansByType = useMemo(() => {
    const map = new Map<MealType, MealPlan>();
    for (const plan of mealPlans ?? []) map.set(plan.meal_type, plan);
    return map;
  }, [mealPlans]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goToDate(addDays(date, -1))}
          aria-label="Previous day"
          className="flex h-11 w-11 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-[length:var(--text-heading)] font-semibold text-[var(--color-text)]">{heading}</h1>
          {!isToday && (
            <button
              type="button"
              onClick={() => goToDate(localToday())}
              className="text-[length:var(--text-caption)] font-medium text-[var(--color-primary)] hover:underline"
            >
              Today
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => goToDate(addDays(date, 1))}
          aria-label="Next day"
          className="flex h-11 w-11 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      {isPending && (
        <div className="flex justify-center py-8">
          <Spinner label="Loading plan" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-error)]">
          Couldn't load today's plan: {error.message}
        </p>
      )}

      {!isPending && !error && (
        <div className="space-y-4">
          {MEAL_TYPES.map((mealType) => (
            <MealSection key={mealType} mealType={mealType} date={date} plan={plansByType.get(mealType)} />
          ))}
        </div>
      )}
    </div>
  );
}
