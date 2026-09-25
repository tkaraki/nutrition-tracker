import { CircleSlash, TriangleAlert, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, ProgressBar } from "../ui";
import { NUTRIENT_DISPLAY, type NutrientKey } from "../../lib/nutrients";
import { formatAmount, formatWithUnit } from "./formatAmount";

interface NutrientTileProps {
  nutrientKey: NutrientKey;
  consumed: number;
  target?: number;
  /** Smaller variant used for the expanded secondary-nutrients grid. */
  compact?: boolean;
}

type TileState = "on-track" | "near-limit" | "over-limit" | "no-target";

/**
 * Sub-state thresholds (see spec): a target is "on track" below 100% of its
 * daily value, "near the limit" from 100-119%, and "significantly over" at
 * 120%+. No target at all is its own state regardless of what was logged.
 */
function tileState(consumed: number, target: number | undefined): TileState {
  if (target === undefined || target === null) return "no-target";
  const pct = (consumed / target) * 100;
  if (pct < 100) return "on-track";
  if (pct < 120) return "near-limit";
  return "over-limit";
}

const numberColorClass: Record<TileState, string> = {
  "on-track": "text-[var(--color-text)]",
  "near-limit": "text-[var(--color-warning)]",
  "over-limit": "text-[var(--color-error)]",
  "no-target": "text-[var(--color-text-muted)]",
};

const progressVariant: Record<"on-track" | "near-limit" | "over-limit", "primary" | "warning" | "error"> = {
  "on-track": "primary",
  "near-limit": "warning",
  "over-limit": "error",
};

const accentBorderColor: Partial<Record<TileState, string>> = {
  "near-limit": "var(--color-warning)",
  "over-limit": "var(--color-error)",
};

export function NutrientTile({ nutrientKey, consumed, target, compact = false }: NutrientTileProps) {
  const meta = NUTRIENT_DISPLAY[nutrientKey];
  const hasTarget = target !== undefined && target !== null;
  const state = tileState(consumed, target);
  const pct = hasTarget ? (consumed / target) * 100 : 0;

  let caption: ReactNode;
  let ariaLabel: string;

  if (state === "on-track") {
    const remaining = Math.max(target! - consumed, 0);
    caption = (
      <span className="text-[var(--color-text-subtle)]">
        {formatWithUnit(remaining, meta.unit)} remaining
      </span>
    );
    ariaLabel = `${meta.label}, ${formatAmount(consumed, meta.unit)} of ${formatAmount(target!, meta.unit)} ${meta.unit}, ${formatAmount(remaining, meta.unit)} ${meta.unit} remaining`;
  } else if (state === "near-limit") {
    const over = consumed - target!;
    caption = (
      <span className="inline-flex items-center gap-1 text-[var(--color-warning)]">
        <TriangleAlert size={14} aria-hidden="true" />
        {formatWithUnit(over, meta.unit)} over target
      </span>
    );
    ariaLabel = `${meta.label}, ${formatAmount(consumed, meta.unit)} of ${formatAmount(target!, meta.unit)} ${meta.unit}, ${formatAmount(over, meta.unit)} ${meta.unit} over target`;
  } else if (state === "over-limit") {
    const over = consumed - target!;
    caption = (
      <span className="inline-flex items-center gap-1 text-[var(--color-error)]">
        <XCircle size={14} fill="var(--color-error)" color="white" aria-hidden="true" />
        {formatWithUnit(over, meta.unit)} over target
      </span>
    );
    ariaLabel = `${meta.label}, ${formatAmount(consumed, meta.unit)} of ${formatAmount(target!, meta.unit)} ${meta.unit}, ${formatAmount(over, meta.unit)} ${meta.unit} over target`;
  } else {
    caption = (
      <Link
        to="/targets"
        className="inline-flex items-center gap-1 text-[var(--color-text-subtle)] underline hover:text-[var(--color-text)]"
      >
        <CircleSlash size={14} aria-hidden="true" />
        No target set
      </Link>
    );
    ariaLabel = `${meta.label}, ${formatAmount(consumed, meta.unit)} ${meta.unit}, no target set`;
  }

  const accentColor = accentBorderColor[state];

  return (
    <Card
      padding={compact ? "sm" : "md"}
      style={accentColor ? { borderLeft: `2px solid ${accentColor}` } : undefined}
    >
      <p className="text-[length:var(--text-caption)] text-[var(--color-text-subtle)] font-semibold uppercase tracking-wide">
        {meta.label}
      </p>
      <p className={`mt-1 ${numberColorClass[state]}`}>
        <span
          className={`tabular-nums font-semibold ${
            compact ? "text-[length:var(--text-heading)]" : "text-[length:var(--text-display-sm)]"
          }`}
        >
          {formatAmount(consumed, meta.unit)}
        </span>
        {hasTarget && (
          <span className="ml-1 inline-block whitespace-nowrap text-[length:var(--text-body-sm)] font-normal text-[var(--color-text-subtle)]">
            / {formatAmount(target!, meta.unit)} {meta.unit}
          </span>
        )}
      </p>
      <div className="mt-2">
        {hasTarget ? (
          <ProgressBar value={pct} variant={progressVariant[state as "on-track" | "near-limit" | "over-limit"]} label={ariaLabel} />
        ) : (
          <div className="border-t border-dashed border-[var(--color-border-strong)]" />
        )}
      </div>
      <p className="mt-2 text-[length:var(--text-caption)]">{caption}</p>
    </Card>
  );
}
