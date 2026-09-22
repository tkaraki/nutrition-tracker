/**
 * Local-timezone-safe date helpers. Every date in this app is a plain
 * YYYY-MM-DD string (matching the backend's DATE columns/params) — never a
 * `Date` object crossing a component boundary, and never derived via
 * `toISOString()`, which is UTC and can land on the wrong calendar day
 * after ~4-5pm in timezones behind UTC.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formats a local Date's Y-M-D as "YYYY-MM-DD", using its local fields (not UTC). */
function formatLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Parses a "YYYY-MM-DD" string into a local-midnight Date (not UTC-midnight). */
function parseLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

/** Today's date as "YYYY-MM-DD", in the browser's local timezone. */
export function localToday(): string {
  return formatLocal(new Date());
}

/** Adds (or subtracts, for negative `days`) days to a "YYYY-MM-DD" string, local-timezone-safe. */
export function addDays(dateStr: string, days: number): string {
  const date = parseLocal(dateStr);
  date.setDate(date.getDate() + days);
  return formatLocal(date);
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });

/** Human-friendly display for a "YYYY-MM-DD" date: "Today", "Yesterday", "Tomorrow", or "Mon, Sep 22". */
export function formatDisplayDate(dateStr: string): string {
  const today = localToday();
  if (dateStr === today) return "Today";
  if (dateStr === addDays(today, -1)) return "Yesterday";
  if (dateStr === addDays(today, 1)) return "Tomorrow";
  return WEEKDAY_FORMAT.format(parseLocal(dateStr));
}
