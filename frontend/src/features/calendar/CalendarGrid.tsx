import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import type { PlatformSlug } from '@shared/schemas/platform';
import { CalendarDayCell } from './CalendarDayCell';
import { WEEK_START_DAY } from './calendar-constants';
import {
  addDays,
  formatLongDate,
  formatWeekdayShort,
  isSameDay,
  isSameMonth,
  toLocalDayKey,
  weekdayOrderFrom,
} from './calendar-date-utils';
import type { CalendarChipItem } from './calendar-grouping';
import { calendarMessages } from './messages';

interface CalendarGridProps {
  windowStart: Date;
  windowEnd: Date; // exclusive
  monthStart: Date;
  buckets: Map<string, CalendarChipItem[]>;
  platformIndex: Map<string, { slug: PlatformSlug; label: string }>;
  pillarLabels: Map<string, string>;
}

// Renders the weekday header row + the day grid. Layout: 7-column CSS grid, one cell per day of
// the window. The window length is always a multiple of 7 (back/forward-filled to whole weeks by
// getCalendarWindow), so the row count is deterministic — 5 or 6 rows.
//
// Today's cell + off-month cells are styled within CalendarDayCell; this grid just provides the
// CSS grid container and computes the per-cell flags.
export function CalendarGrid({
  windowStart,
  windowEnd,
  monthStart,
  buckets,
  platformIndex,
  pillarLabels,
}: CalendarGridProps) {
  const today = useMemo(() => new Date(), []);

  // Generate the list of cell dates by walking windowStart up to windowEnd.
  const cells = useMemo(() => {
    const list: Date[] = [];
    for (let d = new Date(windowStart); d < windowEnd; d = addDays(d, 1)) {
      list.push(new Date(d));
    }
    return list;
  }, [windowStart, windowEnd]);

  const weekdayOrder = weekdayOrderFrom(WEEK_START_DAY);
  const m = calendarMessages.grid;

  return (
    <div role="grid" aria-label={formatLongDate(monthStart)} className="overflow-hidden rounded-lg border-l border-t">
      {/* Weekday header row */}
      <div role="row" className="grid grid-cols-7 border-b bg-muted/30">
        {weekdayOrder.map((weekdayIndex) => (
          <div
            key={weekdayIndex}
            role="columnheader"
            className="border-r px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            <span aria-label={m.weekdayHeaderSrLabel(formatWeekdayShort(weekdayIndex))}>
              {formatWeekdayShort(weekdayIndex)}
            </span>
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div role="row" className={cn('grid grid-cols-7')}>
        {cells.map((date) => {
          const key = toLocalDayKey(date);
          const items = buckets.get(key) ?? [];
          return (
            <CalendarDayCell
              key={key}
              date={date}
              inMonth={isSameMonth(date, monthStart)}
              isToday={isSameDay(date, today)}
              items={items}
              platformIndex={platformIndex}
              pillarLabels={pillarLabels}
            />
          );
        })}
      </div>
    </div>
  );
}
