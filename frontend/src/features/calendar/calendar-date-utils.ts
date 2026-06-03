// Native Date + Intl. No date library dependency (decisions.md).
//
// All functions operate in the user's LOCAL timezone unless explicitly noted. A content item
// scheduled at 2026-12-31T23:30:00Z appears on the local-time day for the viewing user — see
// /context/decisions.md, Chunk 08 timezone decision.
import { MAX_VALID_YEAR, MIN_VALID_YEAR } from './calendar-constants';

export function getMonthStart(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1, 0, 0, 0, 0);
}

// Exclusive: returns the first day of the next month at 00:00 local. Subtract one day to get the
// last day of the target month.
export function getMonthEnd(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Compute the calendar window (a contiguous block of days that covers the visible month, padded
// with surrounding days needed to fill complete weeks). Returns:
//   - windowStart: the date of the first cell (inclusive)
//   - windowEnd: the date AFTER the last cell (exclusive — easier to compare with `<`)
//   - monthStart, monthEnd: same boundaries echoed, useful for off-month flagging on cells
//
// Examples (weekStart = 1 / Monday):
//   May 2026:    monthStart = Fri May 1.  Window starts Mon Apr 27, ends Mon Jun 1.   (35 days, 5 rows)
//   August 2026: monthStart = Sat Aug 1.  Window starts Mon Jul 27, ends Mon Sep 7.   (42 days, 6 rows)
//   February 2026 (28 days starting Sun): Window starts Mon Jan 26, ends Mon Mar 2.  (35 days, 5 rows)
export function getCalendarWindow(
  year: number,
  monthIndex: number,
  weekStart: number,
): {
  windowStart: Date;
  windowEnd: Date;
  monthStart: Date;
  monthEnd: Date;
} {
  const monthStart = getMonthStart(year, monthIndex);
  const monthEnd = getMonthEnd(year, monthIndex);

  // Back-fill before monthStart so the first visible cell is on `weekStart`.
  // (monthStart.getDay() - weekStart + 7) % 7 = days to subtract.
  const startOffset = (monthStart.getDay() - weekStart + 7) % 7;
  const windowStart = addDays(monthStart, -startOffset);

  // Forward-fill after monthEnd. monthEnd is exclusive (first-of-next-month); the LAST visible
  // day of the calendar month is `addDays(monthEnd, -1)`. We want the row to extend until the
  // weekday before `weekStart` next appears. weekend-day = (weekStart + 6) % 7.
  // Days to add to monthEnd (exclusive) so windowEnd is the first cell of the row AFTER the last
  // visible row = (weekStart - monthEnd.getDay() + 7) % 7. If monthEnd already lands on
  // weekStart, we add 0 (the previous row's end already covers everything).
  const endOffset = (weekStart - monthEnd.getDay() + 7) % 7;
  const windowEnd = addDays(monthEnd, endOffset);

  return { windowStart, windowEnd, monthStart, monthEnd };
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// YYYY-MM-DD in LOCAL time. Stable grouping key — the calendar buckets items by this string and
// each cell looks itself up by the same string. Do NOT use `toISOString()` here: that emits UTC,
// which would shift items off their local day at certain hours.
export function toLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse the URL `month=YYYY-MM` param. Invalid input returns null and the caller falls back to
// the current local month — keeps URL hacking benign. Years are bounded by
// MIN_VALID_YEAR/MAX_VALID_YEAR (calendar-constants) so an extreme value (year 99999) doesn't
// produce huge windows.
export function parseMonthParam(value: string | null): { year: number; monthIndex: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const yearStr = match[1];
  const monthStr = match[2];
  if (yearStr === undefined || monthStr === undefined) return null;
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  if (Number.isNaN(year) || Number.isNaN(monthIndex)) return null;
  if (year < MIN_VALID_YEAR || year > MAX_VALID_YEAR) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

export function formatMonthParam(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

// "May 2026" in the user's locale. Locale='default' picks the env locale via Intl.
export function formatMonthLabel(date: Date, locale: string = 'default'): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date);
}

// Short weekday name ("Mon", "Tue", ...) for the column headers. The implementation uses an
// anchor week (2024-01-07 was a Sunday — verified) so weekdayIndex 0..6 maps to Sun..Sat.
export function formatWeekdayShort(weekdayIndex: number, locale: string = 'default'): string {
  // Jan 7, 2024 was a Sunday (verified manually). Adding `weekdayIndex` produces the right weekday.
  const anchor = new Date(2024, 0, 7 + weekdayIndex);
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(anchor);
}

// Full date label for screen readers and the agenda day headers ("Tuesday, May 6, 2026").
export function formatLongDate(date: Date, locale: string = 'default'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// "Mon, May 6" — compact day header used in the agenda.
export function formatShortDate(date: Date, locale: string = 'default'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// "3:30 PM" — used inside chips and the agenda for time-of-day.
export function formatTime(date: Date, locale: string = 'default'): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
}

// Year+month equality. Used by the "Today" button to disable itself when the visible month is
// already the current month.
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

// Month navigation helpers (return the next/prev month indices, handling year wrap).
export function previousMonth(year: number, monthIndex: number): { year: number; monthIndex: number } {
  if (monthIndex === 0) return { year: year - 1, monthIndex: 11 };
  return { year, monthIndex: monthIndex - 1 };
}

export function nextMonth(year: number, monthIndex: number): { year: number; monthIndex: number } {
  if (monthIndex === 11) return { year: year + 1, monthIndex: 0 };
  return { year, monthIndex: monthIndex + 1 };
}

// The ordered list of weekday indices in display order, starting at `weekStart`.
//   weekStart=1 (Mon) → [1, 2, 3, 4, 5, 6, 0]
//   weekStart=0 (Sun) → [0, 1, 2, 3, 4, 5, 6]
export function weekdayOrderFrom(weekStart: number): number[] {
  return Array.from({ length: 7 }, (_unused, i) => (weekStart + i) % 7);
}
