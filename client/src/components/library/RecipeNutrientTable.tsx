import { NUTRIENT_DISPLAY, NUTRIENT_KEYS, type NutrientKey } from "../../lib/nutrients";
import { formatWithUnit } from "../nutrition/formatAmount";

interface RecipeNutrientTableProps {
  totals: Record<NutrientKey, number>;
  loading?: boolean;
}

/** Plain per-serving nutrient values for a recipe's detail view — reference
 *  info, not a progress screen, so no targets/progress bars (deliberately
 *  not reusing Dashboard's `NutrientTile`, which bakes in target-based
 *  states this screen has no use for). */
export function RecipeNutrientTable({ totals, loading = false }: RecipeNutrientTableProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {NUTRIENT_KEYS.map((key) => {
        const meta = NUTRIENT_DISPLAY[key];
        return (
          <div key={key} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] p-3">
            <p className="text-[length:var(--text-caption)] text-[var(--color-text-subtle)] font-semibold uppercase tracking-wide">
              {meta.label}
            </p>
            <p className="mt-1 text-[length:var(--text-body)] font-semibold text-[var(--color-text)]">
              {loading ? "…" : formatWithUnit(totals[key] ?? 0, meta.unit)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
