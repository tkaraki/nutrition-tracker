import { Check, Minus, TriangleAlert } from "lucide-react";
import { Button, Card } from "../ui";
import { useNutritionRange } from "../../hooks/useNutrition";
import { NUTRIENT_KEYS, type NutrientKey } from "../../lib/nutrients";
import type { DayTotals, NutrientTargets } from "../../api/types";
import { addDays } from "../../lib/dates";

interface DayStripProps {
  /** The date currently being viewed on the dashboard — the strip shows the 7 days ending here. */
  date: string;
  onSelectDate: (date: string) => void;
}

type DayStatus = "on-target" | "partial" | "over-or-under" | "no-data";

const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: "short" });

/** Parses a "YYYY-MM-DD" string into a local-midnight Date (mirrors lib/dates.ts's private parseLocal). */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

/**
 * Derives a per-day status glyph client-side (the backend has no such
 * field). Judgment call, documented here:
 *  - "no-data": nothing at all was logged that day (sum of every tracked
 *    nutrient's total is zero), regardless of whether targets exist.
 *  - Otherwise, only nutrients with a target set are considered. For each,
 *    "within target" means 85-115% of the daily target. If ALL targeted
 *    nutrients land in that band -> "on-target"; if NONE do ->
 *    "over-or-under"; a mix -> "partial".
 *  - Edge case: something was logged but the user has no targets set at
 *    all, so the on/off-target fraction can't be computed. Treated as
 *    "partial" (an inconclusive/neutral signal) rather than misrepresenting
 *    it as fully on-target or fully off-target.
 */
function computeDayStatus(day: DayTotals, targetedKeys: NutrientKey[], targets: NutrientTargets): DayStatus {
  const loggedTotal = NUTRIENT_KEYS.reduce((sum, key) => sum + (day.totals[key] ?? 0), 0);
  if (loggedTotal === 0) return "no-data";

  if (targetedKeys.length === 0) return "partial";

  const withinTargetCount = targetedKeys.filter((key) => {
    const target = targets[key];
    if (!target) return false;
    const pct = ((day.totals[key] ?? 0) / target) * 100;
    return pct >= 85 && pct <= 115;
  }).length;

  if (withinTargetCount === targetedKeys.length) return "on-target";
  if (withinTargetCount === 0) return "over-or-under";
  return "partial";
}

const GLYPH_SIZE = 28;

function DayGlyph({ status }: { status: DayStatus }) {
  if (status === "on-target") {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-[var(--color-success)]"
        style={{ width: GLYPH_SIZE, height: GLYPH_SIZE }}
        title="On target"
      >
        <Check size={16} color="white" aria-hidden="true" />
        <span className="sr-only">On target</span>
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full border border-[var(--color-border-strong)]"
        style={{
          width: GLYPH_SIZE,
          height: GLYPH_SIZE,
          backgroundImage:
            "conic-gradient(var(--color-info) 0deg 180deg, var(--color-surface-alt) 180deg 360deg)",
        }}
        title="Partial"
      >
        <span className="sr-only">Partial</span>
      </span>
    );
  }
  if (status === "over-or-under") {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-[var(--color-warning)]"
        style={{ width: GLYPH_SIZE, height: GLYPH_SIZE }}
        title="Needs attention"
      >
        <TriangleAlert size={16} color="white" aria-hidden="true" />
        <span className="sr-only">Needs attention</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[var(--color-text-subtle)]"
      style={{ width: GLYPH_SIZE, height: GLYPH_SIZE, border: "1.5px dashed var(--color-text-subtle)" }}
      title="No data logged"
    >
      <Minus size={16} aria-hidden="true" />
      <span className="sr-only">No data logged</span>
    </span>
  );
}

export function DayStrip({ date, onSelectDate }: DayStripProps) {
  const from = addDays(date, -6);
  const range = useNutritionRange(from, date);

  if (range.isPending) {
    return (
      <div className="flex justify-between gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-20 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]"
          />
        ))}
      </div>
    );
  }

  if (range.isError) {
    return (
      <Card>
        <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          Couldn't load the weekly overview.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => range.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  const days = [...range.data.days].sort((a, b) => a.date.localeCompare(b.date));
  const targetedKeys = Object.keys(range.data.targets) as NutrientKey[];

  return (
    <div className="flex justify-between gap-1">
      {days.map((day) => {
        const status = computeDayStatus(day, targetedKeys, range.data.targets);
        const isViewing = day.date === date;
        const localDate = parseLocalDate(day.date);
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDate(day.date)}
            className="flex-1 flex flex-col items-center gap-1 min-w-11 min-h-11 px-1 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-alt)] transition-colors"
            style={{
              borderBottom: isViewing ? "2px solid var(--color-primary)" : "2px solid transparent",
            }}
          >
            <span className="text-[length:var(--text-caption)] text-[var(--color-text-subtle)] uppercase">
              {WEEKDAY_FORMAT.format(localDate)}
            </span>
            <DayGlyph status={status} />
            <span className="text-[length:var(--text-body-sm)] tabular-nums text-[var(--color-text)]">
              {localDate.getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
