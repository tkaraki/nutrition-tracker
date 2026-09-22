/**
 * Shared amount formatter for nutrient values across the dashboard —
 * rounds to at most 1 decimal place and drops trailing ".0" so whole
 * numbers ("84") and fractional ones ("2.5") both read naturally.
 */
export function formatAmount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
