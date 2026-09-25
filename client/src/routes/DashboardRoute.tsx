import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import { Button, Card, EmptyState } from "../components/ui";
import { DayStrip } from "../components/nutrition/DayStrip";
import { NutrientTile } from "../components/nutrition/NutrientTile";
import { formatWithUnit } from "../components/nutrition/formatAmount";
import { useDailyNutrition } from "../hooks/useNutrition";
import { NUTRIENT_DISPLAY, NUTRIENT_KEYS, type NutrientKey } from "../lib/nutrients";
import { addDays, formatDisplayDate, localToday } from "../lib/dates";
import type { NutrientTotals } from "../api/types";

const PRIMARY_KEYS = [...NUTRIENT_KEYS]
  .filter((key) => NUTRIENT_DISPLAY[key].primary)
  .sort((a, b) => NUTRIENT_DISPLAY[a].order - NUTRIENT_DISPLAY[b].order);

const SECONDARY_KEYS = [...NUTRIENT_KEYS]
  .filter((key) => !NUTRIENT_DISPLAY[key].primary)
  .sort((a, b) => NUTRIENT_DISPLAY[a].order - NUTRIENT_DISPLAY[b].order);

function secondarySummaryLine(totals: NutrientTotals): string {
  const [first, second, ...rest] = SECONDARY_KEYS;
  if (!first) return "";
  const format = (key: NutrientKey) =>
    `${NUTRIENT_DISPLAY[key].label} ${formatWithUnit(totals[key] ?? 0, NUTRIENT_DISPLAY[key].unit)}`;
  const shown = [format(first)];
  if (second) shown.push(format(second));
  const line = shown.join(" · ");
  return rest.length > 0 ? `${line} · +${rest.length} more` : line;
}

export function DashboardRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = localToday();
  const date = searchParams.get("date") ?? today;
  const isToday = date === today;
  const [showAllNutrients, setShowAllNutrients] = useState(false);

  const daily = useDailyNutrition(date);

  function navigateToDate(nextDate: string) {
    // Keep the URL clean for the default (today) case; write ?date=
    // explicitly for every other date so it's shareable/bookmarkable.
    if (nextDate === today) {
      setSearchParams({});
    } else {
      setSearchParams({ date: nextDate });
    }
  }

  const isEmpty =
    daily.data !== undefined &&
    Object.keys(daily.data.targets).length === 0 &&
    NUTRIENT_KEYS.every((key) => (daily.data!.totals[key] ?? 0) === 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => navigateToDate(addDays(date, -1))}
          className="inline-flex items-center justify-center min-w-11 min-h-11 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-alt)]"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-[length:var(--text-heading)] font-semibold min-w-[11rem] text-center">
          {formatDisplayDate(date)}
        </h1>
        <button
          type="button"
          aria-label="Next day"
          onClick={() => navigateToDate(addDays(date, 1))}
          className="inline-flex items-center justify-center min-w-11 min-h-11 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-alt)]"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
        {!isToday && (
          <Button variant="secondary" size="sm" onClick={() => navigateToDate(today)}>
            Today
          </Button>
        )}
      </div>

      {daily.isPending ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRIMARY_KEYS.map((key) => (
            <div
              key={key}
              className="h-32 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]"
            />
          ))}
        </div>
      ) : daily.isError ? (
        <Card>
          <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            Couldn't load today's totals.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => daily.refetch()}>
            Retry
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRIMARY_KEYS.map((key) => (
            <NutrientTile
              key={key}
              nutrientKey={key}
              consumed={daily.data.totals[key] ?? 0}
              target={daily.data.targets[key]}
            />
          ))}
        </div>
      )}

      {daily.data && (
        <div>
          <button
            type="button"
            aria-expanded={showAllNutrients}
            onClick={() => setShowAllNutrients((v) => !v)}
            className="inline-flex items-center gap-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {showAllNutrients ? "Hide extra nutrients" : "Show all nutrients"}
            <span aria-hidden="true">▾</span>
          </button>
          {!showAllNutrients ? (
            <p className="mt-2 text-[length:var(--text-body-sm)] text-[var(--color-text-subtle)]">
              {secondarySummaryLine(daily.data.totals)}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SECONDARY_KEYS.map((key) => (
                <NutrientTile
                  key={key}
                  nutrientKey={key}
                  consumed={daily.data!.totals[key] ?? 0}
                  target={daily.data!.targets[key]}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}

      <DayStrip date={date} onSelectDate={navigateToDate} />

      {isEmpty && (
        <Card>
          <EmptyState
            icon={<Utensils aria-hidden="true" />}
            title="You haven't logged anything yet"
            description="Plan a meal and mark it eaten to start tracking your nutrition."
            action={
              <div className="flex flex-col items-center gap-2">
                <Link to="/plan">
                  <Button variant="primary">Go to planner</Button>
                </Link>
                <Link
                  to="/targets"
                  className="text-[length:var(--text-caption)] font-medium text-[var(--color-primary)] hover:underline"
                >
                  or set your daily targets →
                </Link>
              </div>
            }
          />
        </Card>
      )}
    </div>
  );
}
