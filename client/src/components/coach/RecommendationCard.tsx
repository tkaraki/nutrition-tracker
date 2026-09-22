import { AlertCircle, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { Badge } from "../ui";
import { NUTRIENT_DISPLAY, type NutrientKey } from "../../lib/nutrients";
import type { CoachRecommendation } from "../../api/types";

interface RecommendationCardProps {
  recommendation: CoachRecommendation;
}

interface PriorityConfig {
  label: string;
  borderWidth: string;
  borderColorVar: string;
  colorClass: string;
  backgroundClass: string;
  paddingClass: string;
  textSizeClass: string;
  Icon: LucideIcon;
  /** true = filled glyph (high priority only), false = outline. */
  iconFilled: boolean;
}

// Three-channel priority signal per spec: border weight + icon style/color +
// a text label ("HIGH/MEDIUM/LOW PRIORITY") that never relies on color alone.
const PRIORITY_CONFIG: Record<CoachRecommendation["priority"], PriorityConfig> = {
  high: {
    label: "HIGH PRIORITY",
    borderWidth: "4px",
    borderColorVar: "var(--color-error)",
    colorClass: "text-[var(--color-error)]",
    backgroundClass: "bg-[var(--color-error-wash)]",
    paddingClass: "p-5",
    textSizeClass: "text-[length:var(--text-body)]",
    Icon: TriangleAlert,
    iconFilled: true,
  },
  medium: {
    label: "MEDIUM PRIORITY",
    borderWidth: "3px",
    borderColorVar: "var(--color-warning)",
    colorClass: "text-[var(--color-warning)]",
    backgroundClass: "bg-[var(--color-surface)]",
    paddingClass: "p-5",
    textSizeClass: "text-[length:var(--text-body)]",
    Icon: AlertCircle,
    iconFilled: false,
  },
  low: {
    label: "LOW PRIORITY",
    borderWidth: "2px",
    borderColorVar: "var(--color-info)",
    colorClass: "text-[var(--color-info)]",
    backgroundClass: "bg-[var(--color-surface)]",
    paddingClass: "p-4",
    textSizeClass: "text-[length:var(--text-body-sm)]",
    Icon: Info,
    iconFilled: false,
  },
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const config = PRIORITY_CONFIG[recommendation.priority];
  const { Icon } = config;

  return (
    <div
      className={`border border-[var(--color-border)] rounded-[var(--radius-md)] ${config.backgroundClass} ${config.paddingClass}`}
      style={{
        borderLeftWidth: config.borderWidth,
        borderLeftColor: config.borderColorVar,
      }}
    >
      <div
        className={`flex items-center gap-1.5 text-[length:var(--text-caption)] font-bold uppercase tracking-[0.04em] ${config.colorClass}`}
      >
        <Icon size={14} aria-hidden="true" fill={config.iconFilled ? "currentColor" : "none"} />
        {config.label}
      </div>
      <h3 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)] mt-1.5">
        {recommendation.title}
      </h3>
      <p className={`${config.textSizeClass} text-[var(--color-text-muted)] mt-1`}>
        {recommendation.detail}
      </p>
      {recommendation.nutrient_keys.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {recommendation.nutrient_keys.map((key) => (
            <Badge key={key} variant="neutral">
              {NUTRIENT_DISPLAY[key as NutrientKey]?.label ?? key}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
