import { cn } from '@/lib/utils';
import type { PlatformSlug } from '@shared/schemas/platform';
import { CalendarChip } from './CalendarChip';
import { CalendarOverflowPopover } from './CalendarOverflowPopover';
import { MAX_CHIPS_PER_CELL } from './calendar-constants';
import type { CalendarChipItem } from './calendar-grouping';
import { calendarMessages } from './messages';
import { formatLongDate, isSameDay } from './calendar-date-utils';

interface CalendarDayCellProps {
  date: Date;
  // True if the cell's day belongs to the visible calendar month. False for off-month padding cells.
  inMonth: boolean;
  // True if the cell's day equals today (local time).
  isToday: boolean;
  // Items bucketed onto this day, sorted chronologically (calendar-grouping.ts).
  items: CalendarChipItem[];
  platformIndex: Map<string, { slug: PlatformSlug; label: string }>;
  pillarLabels: Map<string, string>;
}

export function CalendarDayCell({
  date,
  inMonth,
  isToday,
  items,
  platformIndex,
  pillarLabels,
}: CalendarDayCellProps) {
  const m = calendarMessages.grid;
  const visibleItems = items.slice(0, MAX_CHIPS_PER_CELL);
  const overflowItems = items.slice(MAX_CHIPS_PER_CELL);

  // Defense: today flag is recomputed at parent level (per-render); this same-day comparison is
  // a safety net in case the parent forgot.
  const todaySafety = isToday || isSameDay(date, new Date());

  const longLabel = `${formatLongDate(date)}${todaySafety ? m.todayAriaSuffix : ''}`;
  const ariaLabel = m.cellAriaLabel(longLabel, items.length);

  return (
    <div
      role="gridcell"
      aria-label={ariaLabel}
      className={cn(
        'flex min-h-[120px] flex-col gap-1 border-b border-r p-1.5 sm:min-h-[80px]',
        inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground',
        todaySafety && 'ring-2 ring-status-scheduled ring-inset',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-xs font-medium',
            inMonth ? 'text-foreground' : 'text-muted-foreground/60',
            todaySafety && 'text-status-scheduled',
          )}
        >
          {date.getDate()}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        {visibleItems.map((item) => {
          const platform = item.platform_id ? platformIndex.get(item.platform_id) : undefined;
          const pillarLabel = item.pillar_id ? (pillarLabels.get(item.pillar_id) ?? null) : null;
          return (
            <CalendarChip
              key={item.id}
              item={item}
              platformSlug={platform?.slug ?? null}
              platformLabel={platform?.label ?? null}
              pillarLabel={pillarLabel}
            />
          );
        })}
      </div>

      {overflowItems.length > 0 && (
        <CalendarOverflowPopover
          overflowItems={overflowItems}
          date={date}
          platformIndex={platformIndex}
          pillarLabels={pillarLabels}
        />
      )}
    </div>
  );
}
