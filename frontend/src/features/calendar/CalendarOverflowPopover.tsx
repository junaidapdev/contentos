import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { PlatformSlug } from '@shared/schemas/platform';
import { CalendarChip } from './CalendarChip';
import type { CalendarChipItem } from './calendar-grouping';
import { calendarMessages } from './messages';
import { formatLongDate } from './calendar-date-utils';

interface CalendarOverflowPopoverProps {
  // The items hidden behind "+N more" — i.e., everything after the inline-rendered prefix.
  overflowItems: CalendarChipItem[];
  date: Date;
  platformIndex: Map<string, { slug: PlatformSlug; label: string }>;
  pillarLabels: Map<string, string>;
}

// "+N more" popover. Lists every overflow chip in a vertical stack using the same chip
// component so behavior stays identical: each chip is still its own popover trigger. The
// container popover is closed automatically when a chip's own popover opens (Radix manages
// focus + nested popover stacking).
export function CalendarOverflowPopover({
  overflowItems,
  date,
  platformIndex,
  pillarLabels,
}: CalendarOverflowPopoverProps) {
  const m = calendarMessages.grid;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${m.overflowMore(overflowItems.length)} on ${formatLongDate(date)}`}
          className="w-full rounded text-left text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {m.overflowMore(overflowItems.length)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 p-3" align="start">
        <p className="text-xs font-medium text-muted-foreground">{formatLongDate(date)}</p>
        <div className="space-y-1">
          {overflowItems.map((item) => {
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
      </PopoverContent>
    </Popover>
  );
}
