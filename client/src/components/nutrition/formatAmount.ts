/**
 * Shared amount formatter for nutrient values across the dashboard —
 * rounds to at most 1 decimal place and drops trailing ".0" so whole
 * numbers ("84") and fractional ones ("2.5") both read naturally.
 * Calories are always whole numbers: a tenth of a kcal is noise.
 */
export function formatAmount(value: number, unit?: string): string {
  if (unit === "kcal") return String(Math.round(value));
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** `formatAmount` plus its unit, separated by a space ("84 g", "1152 kcal"). */
export function formatWithUnit(value: number, unit: string): string {
  return `${formatAmount(value, unit)} ${unit}`;
}
