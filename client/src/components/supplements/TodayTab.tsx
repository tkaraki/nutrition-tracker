import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Pill } from "lucide-react";
import { Button, Card, EmptyState, Spinner } from "../ui";
import { useRoutineDay, useSupplements } from "../../hooks/useSupplements";
import { addDays, formatDisplayDate, localToday } from "../../lib/dates";
import { SLOT_LABELS, SUPPLEMENT_SLOTS } from "../../api/supplements";
import type { RoutineDayItem, Supplement, SupplementSlot } from "../../api/supplements";
import { SupplementDoseRow } from "./SupplementDoseRow";
import { LoggedTodayRow } from "./LoggedTodayRow";
import { AdHocDoseForm } from "./AdHocDoseForm";

const MONTH_DAY_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const RELATIVE_LABELS = new Set(["Today", "Yesterday", "Tomorrow"]);

function monthDayLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return MONTH_DAY_FORMAT.format(new Date(year!, month! - 1, day!));
}

/** Today tab: routine doses for a date grouped by slot (fixed order, a slot
 * section only renders if it has ≥1 scheduled item that day), plus any
 * ad-hoc logs in "Also logged today", plus the ad-hoc logging form. */
export function TodayTab() {
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

  const { data: day, isPending, error } = useRoutineDay(date);
  const { data: supplements } = useSupplements();
  const supplementsById = useMemo(() => {
    const map = new Map<number, Supplement>();
    for (const s of supplements ?? []) map.set(s.id, s);
    return map;
  }, [supplements]);

  const groupedBySlot = useMemo(() => {
    const map = new Map<SupplementSlot | null, RoutineDayItem[]>();
    for (const item of day?.scheduled ?? []) {
      const list = map.get(item.slot) ?? [];
      list.push(item);
      map.set(item.slot, list);
    }
    return map;
  }, [day]);

  const [showAdHocForm, setShowAdHocForm] = useState(false);

  const hasAnything = (day?.scheduled.length ?? 0) > 0 || (day?.unscheduled.length ?? 0) > 0;

  return (
    <div className="space-y-4">
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
          <h2 className="text-[length:var(--text-heading)] font-semibold text-[var(--color-text)]">{heading}</h2>
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
          <Spinner label="Loading today's supplements" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-error)]">
          Couldn't load this day: {error.message}
        </p>
      )}

      {!isPending && !error && !hasAnything && (
        <EmptyState
          icon={<Pill aria-hidden="true" />}
          title="Nothing scheduled today."
          description="Add items to your routine, or log a dose ad hoc."
          action={
            !showAdHocForm ? (
              <Button variant="secondary" size="sm" onClick={() => setShowAdHocForm(true)}>
                + Log an ad-hoc dose
              </Button>
            ) : (
              <AdHocDoseForm date={date} onDone={() => setShowAdHocForm(false)} />
            )
          }
        />
      )}

      {!isPending && !error && hasAnything && (
        <div className="space-y-3">
          {SUPPLEMENT_SLOTS.map((slot) => {
            const items = groupedBySlot.get(slot);
            if (!items || items.length === 0) return null;
            return (
              <Card key={slot} padding="sm">
                <h3 className="mb-2 text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)]">
                  {SLOT_LABELS[slot]}
                </h3>
                <div>
                  {items.map((item) => (
                    <SupplementDoseRow key={item.routine_item_id} item={item} date={date} />
                  ))}
                </div>
              </Card>
            );
          })}

          {(groupedBySlot.get(null)?.length ?? 0) > 0 && (
            <Card padding="sm">
              <h3 className="mb-2 text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)]">
                Anytime
              </h3>
              <div>
                {groupedBySlot.get(null)!.map((item) => (
                  <SupplementDoseRow key={item.routine_item_id} item={item} date={date} />
                ))}
              </div>
            </Card>
          )}

          {!showAdHocForm && (
            <Button variant="secondary" size="sm" onClick={() => setShowAdHocForm(true)}>
              + Log an ad-hoc dose
            </Button>
          )}
          {showAdHocForm && <AdHocDoseForm date={date} onDone={() => setShowAdHocForm(false)} />}

          {(day?.unscheduled.length ?? 0) > 0 && (
            <Card padding="sm">
              <h3 className="mb-2 text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)]">
                Also logged today
              </h3>
              <div>
                {day!.unscheduled.map((log) => (
                  <LoggedTodayRow key={log.id} log={log} date={date} supplement={supplementsById.get(log.supplement_id)} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
