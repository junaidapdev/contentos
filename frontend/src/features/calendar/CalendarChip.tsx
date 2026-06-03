import { useState } from 'react';
import {
  CornerUpLeftIcon,
  CornerUpRightIcon,
  LayersIcon,
  Share2Icon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import { STATUS_LABELS } from '@/features/content-items/status-config';
import type { ContentItemStatus } from '@shared/schemas/content-item';
import type { PlatformSlug } from '@shared/schemas/platform';
import { CalendarChipPopover } from './CalendarChipPopover';
import { PLATFORM_ABBREVIATIONS, calendarMessages } from './messages';
import type { CalendarChipItem } from './calendar-grouping';
import { formatTime } from './calendar-date-utils';

interface CalendarChipProps {
  item: CalendarChipItem;
  // Resolved by the parent so each chip doesn't re-look-up the platforms list.
  platformSlug: PlatformSlug | null;
  platformLabel: string | null;
  pillarLabel: string | null;
}

// Saturated status colors for the chip's left edge. These intentionally differ from the
// muted-tint StatusBadge classes in status-config.ts — on the calendar the stripe is the only
// signal, so it needs to be vivid. Uses the same `--color-status-*` design tokens.
const STATUS_STRIPE_CLASSES: Record<ContentItemStatus, string> = {
  idea: 'bg-status-idea',
  drafting: 'bg-status-drafting',
  ready: 'bg-status-ready',
  scheduled: 'bg-status-scheduled',
  published: 'bg-status-published',
};

// Compact horizontal chip — status stripe on the left, platform abbreviation in a monospaced
// badge, truncated title, then relationship icons on the right. Color is paired with the icon
// + the aria-label (which spells out status name) for color-blind users.
export function CalendarChip({
  item,
  platformSlug,
  platformLabel,
  pillarLabel,
}: CalendarChipProps) {
  const m = calendarMessages.chip;
  const [open, setOpen] = useState(false);

  const abbr = platformSlug ? PLATFORM_ABBREVIATIONS[platformSlug] : null;
  const time = formatTime(item.renderedAt);
  const ariaLabel = `${m.ariaLabel(item.title, STATUS_LABELS[item.status], platformLabel)}, ${m.timeLabel(time)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          title={item.title}
          className={cn(
            'group/chip flex h-[22px] w-full items-center gap-1 overflow-hidden rounded-md border border-input bg-card pr-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {/* Status stripe (left edge). */}
          <span
            aria-hidden="true"
            className={cn('h-full w-1 shrink-0 rounded-l-md', STATUS_STRIPE_CLASSES[item.status])}
          />
          {/* Platform abbreviation. */}
          {abbr && (
            <span className="shrink-0 rounded bg-muted px-1 font-mono text-[10px] font-medium leading-4 text-muted-foreground">
              {abbr}
            </span>
          )}
          {/* Title — truncates. */}
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.title}</span>
          {/* Relationship indicators (right edge). */}
          <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
            {item.cross_post_group_size > 1 && (
              <span
                aria-label={m.indicatorCrossPostLabel}
                title={m.indicatorCrossPostLabel}
                className="inline-flex items-center"
              >
                <Share2Icon className="size-3" aria-hidden="true" />
                {item.cross_post_group_size - 1}
              </span>
            )}
            {item.sibling_group_size > 1 && (
              <span
                aria-label={m.indicatorSiblingLabel}
                title={m.indicatorSiblingLabel}
                className="inline-flex items-center"
              >
                <LayersIcon className="size-3" aria-hidden="true" />
              </span>
            )}
            {item.repurposed_from_parent_id !== null && (
              <span
                aria-label={m.indicatorRepurposedFromLabel}
                title={m.indicatorRepurposedFromLabel}
                className="inline-flex items-center"
              >
                <CornerUpLeftIcon className="size-3" aria-hidden="true" />
              </span>
            )}
            {item.repurposed_children_count > 0 && (
              <span
                aria-label={m.indicatorRepurposedIntoLabel}
                title={m.indicatorRepurposedIntoLabel}
                className="inline-flex items-center"
              >
                <CornerUpRightIcon className="size-3" aria-hidden="true" />
                {item.repurposed_children_count}
              </span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      {open && (
        <CalendarChipPopover
          item={item}
          platformLabel={platformLabel}
          pillarLabel={pillarLabel}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </Popover>
  );
}
