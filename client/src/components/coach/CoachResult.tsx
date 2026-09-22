import { Check } from "lucide-react";
import type { CoachAdviceResponse, CoachRecommendation } from "../../api/types";
import { NutrientDetailTable } from "./NutrientDetailTable";
import { RecommendationCard } from "./RecommendationCard";

interface CoachResultProps {
  data: CoachAdviceResponse;
}

const PRIORITY_ORDER: Record<CoachRecommendation["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Stable sort by priority (high -> medium -> low), preserving the model's
 *  within-priority order. */
function sortByPriority(recs: CoachRecommendation[]): CoachRecommendation[] {
  return recs
    .map((rec, index) => ({ rec, index }))
    .sort((a, b) => PRIORITY_ORDER[a.rec.priority] - PRIORITY_ORDER[b.rec.priority] || a.index - b.index)
    .map(({ rec }) => rec);
}

export function CoachResult({ data }: CoachResultProps) {
  const recommendations = sortByPriority(data.advice.recommendations);

  return (
    <div className="flex flex-col gap-8">
      <p className="text-[length:var(--text-body)] text-[var(--color-text)]">{data.advice.summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)]">
            Recommendations
          </h2>
          {recommendations.map((rec, i) => (
            <RecommendationCard key={i} recommendation={rec} />
          ))}
        </div>

        {data.advice.doing_well.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)]">
              Doing well
            </h2>
            <ul className="flex flex-col gap-1.5">
              {data.advice.doing_well.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]"
                >
                  <Check
                    size={16}
                    className="text-[var(--color-success)] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <NutrientDetailTable nutrients={data.nutrients} />
    </div>
  );
}
