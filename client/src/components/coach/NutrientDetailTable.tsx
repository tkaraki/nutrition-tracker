import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { NUTRIENT_DISPLAY } from "../../lib/nutrients";
import type { CoachNutrientStat } from "../../api/types";

interface NutrientDetailTableProps {
  nutrients: CoachNutrientStat[];
}

/** Collapsed-by-default detail table behind a full-width ghost toggle row. */
export function NutrientDetailTable({ nutrients }: NutrientDetailTableProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-3 text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] bg-transparent hover:bg-[var(--color-surface-alt)] transition-colors duration-150"
      >
        Nutrient detail
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <table className="w-full border-t border-[var(--color-border)] text-[length:var(--text-body-sm)]">
          <thead>
            <tr className="bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">
              <th className="text-left font-medium px-4 py-2">Nutrient</th>
              <th className="text-right font-medium px-4 py-2">Avg per day</th>
              <th className="text-right font-medium px-4 py-2">Target per day</th>
              <th className="text-right font-medium px-4 py-2">% of target</th>
              <th className="text-right font-medium px-4 py-2">Days met</th>
            </tr>
          </thead>
          <tbody>
            {nutrients.map((n) => {
              const display = NUTRIENT_DISPLAY[n.nutrient_key];
              const unit = display ? ` ${display.unit}` : "";
              return (
                <tr key={n.nutrient_key} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2 text-[var(--color-text)]">
                    {display?.label ?? n.nutrient_key}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {n.avg_per_day}
                    {unit}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {n.target_per_day}
                    {unit}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{n.pct_of_target}%</td>
                  <td className="px-4 py-2 text-right tabular-nums">{n.days_met_target}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
