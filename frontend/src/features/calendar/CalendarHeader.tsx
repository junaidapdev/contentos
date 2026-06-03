import { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, FilterIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import { usePillars } from '@/features/pillars/usePillars';
import type { ContentItemStatus } from '@shared/schemas/content-item';
import {
  formatMonthLabel,
  getMonthStart,
  isSameMonth,
} from './calendar-date-utils';
import {
  STATUS_FILTER_OPTIONS,
  calendarMessages,
} from './messages';
import type { CalendarFiltersApi } from './useCalendarFilters';

interface CalendarHeaderProps {
  api: CalendarFiltersApi;
}

const ANY_VALUE = '__any__';

export function CalendarHeader({ api }: CalendarHeaderProps) {
  const m = calendarMessages;
  const platformsQuery = usePlatforms();
  const pillarsQuery = usePillars();
  const platforms = platformsQuery.data ?? [];
  const pillars = pillarsQuery.data ?? [];

  const monthDate = getMonthStart(api.filters.monthYear, api.filters.monthIndex);
  const todayInVisibleMonth = isSameMonth(monthDate, new Date());

  const statusSet = useMemo(() => new Set(api.filters.statuses), [api.filters.statuses]);
  const activeStatusCount = api.filters.statuses.length;

  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  const toggleStatus = (value: ContentItemStatus): void => {
    const next = new Set(statusSet);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    api.setStatuses(Array.from(next));
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={m.nav.prevMonth}
          onClick={api.goPreviousMonth}
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
        </Button>
        <div className="min-w-[10rem] text-center text-base font-semibold">
          {formatMonthLabel(monthDate)}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={m.nav.nextMonth}
          onClick={api.goNextMonth}
        >
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={todayInVisibleMonth}
          onClick={api.goToday}
        >
          {m.nav.today}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Status multi-select */}
        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={m.filters.statusButtonAria(activeStatusCount)}
              className="gap-1.5"
            >
              <FilterIcon className="size-3.5" aria-hidden="true" />
              {m.filters.statusLabel}
              <span
                className={cn(
                  'ml-1 rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground',
                )}
              >
                {m.filters.statusActiveCount(activeStatusCount)}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-1.5">
              {STATUS_FILTER_OPTIONS.map((option) => (
                <Label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={statusSet.has(option.value)}
                    onCheckedChange={() => {
                      toggleStatus(option.value);
                    }}
                    aria-label={option.label}
                  />
                  <span>{option.label}</span>
                </Label>
              ))}
              {!api.isDefaultStatuses && (
                <>
                  <hr className="my-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      api.resetStatusesToDefault();
                    }}
                  >
                    {m.filters.statusResetToDefault}
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Platform single-select */}
        <Select
          value={api.filters.platformId ?? ANY_VALUE}
          onValueChange={(value) => {
            api.setPlatformId(value === ANY_VALUE ? null : value);
          }}
        >
          <SelectTrigger size="sm" className="w-44" aria-label={m.filters.platformLabel}>
            <SelectValue placeholder={m.filters.anyPlatform} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>{m.filters.anyPlatform}</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Pillar single-select */}
        <Select
          value={api.filters.pillarId ?? ANY_VALUE}
          onValueChange={(value) => {
            api.setPillarId(value === ANY_VALUE ? null : value);
          }}
        >
          <SelectTrigger size="sm" className="w-44" aria-label={m.filters.pillarLabel}>
            <SelectValue placeholder={m.filters.anyPillar} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_VALUE}>{m.filters.anyPillar}</SelectItem>
            {pillars.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {api.hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              api.clearFilters();
            }}
          >
            {m.filters.clearLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
