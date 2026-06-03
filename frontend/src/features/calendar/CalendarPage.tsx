import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ErrorState,
  NetworkErrorState,
  PageHeader,
  SkeletonList,
} from '@/components/feedback';
import { isNetworkError } from '@/lib/network-error';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import { usePillars } from '@/features/pillars/usePillars';
import type { PlatformSlug } from '@shared/schemas/platform';
import { WEEK_START_DAY } from './calendar-constants';
import { CalendarAgenda } from './CalendarAgenda';
import { CalendarEmptyState } from './CalendarEmptyState';
import { CalendarGrid } from './CalendarGrid';
import { CalendarHeader } from './CalendarHeader';
import {
  bucketItemsByDay,
  sortAgendaItems,
} from './calendar-grouping';
import { getCalendarWindow } from './calendar-date-utils';
import { calendarErrorMessage, calendarMessages } from './messages';
import { useCalendarFilters } from './useCalendarFilters';
import { useCalendarWindow } from './useCalendarWindow';

// Skeleton grid — 7 columns × 5 rows. Dimensions approximate a typical 35-day window; the
// shimmer pulses Skeleton block matches the calendar cell rhythm. Inlined as a documented
// exception to the shared-primitive rule because no shared primitive paints a 7×5 grid.
function GridSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border-l border-t" aria-busy="true">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {Array.from({ length: 7 }).map((_unused, index) => (
          <div key={index} className="border-r px-2 py-2">
            <Skeleton className="mx-auto h-3 w-8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_unused, index) => (
          <div key={index} className="min-h-[120px] border-b border-r p-1.5 sm:min-h-[80px]">
            <Skeleton className="h-3 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarPage() {
  const m = calendarMessages;
  const api = useCalendarFilters();
  const windowQuery = useCalendarWindow(api.filters);

  const platformsQuery = usePlatforms();
  const pillarsQuery = usePillars();
  const platforms = useMemo(() => platformsQuery.data ?? [], [platformsQuery.data]);
  const pillars = useMemo(() => pillarsQuery.data ?? [], [pillarsQuery.data]);

  // Resolved per-id maps so chips don't re-look-up on every render.
  const platformIndex = useMemo(
    () => new Map<string, { slug: PlatformSlug; label: string }>(
      platforms.map((p) => [p.id, { slug: p.slug, label: p.display_name }]),
    ),
    [platforms],
  );
  const platformLabels = useMemo(
    () => new Map(platforms.map((p) => [p.id, p.display_name])),
    [platforms],
  );
  const pillarLabels = useMemo(() => new Map(pillars.map((p) => [p.id, p.name])), [pillars]);

  const { windowStart, windowEnd, monthStart } = useMemo(
    () => getCalendarWindow(api.filters.monthYear, api.filters.monthIndex, WEEK_START_DAY),
    [api.filters.monthYear, api.filters.monthIndex],
  );

  const buckets = useMemo(
    () => bucketItemsByDay(windowQuery.data ?? []),
    [windowQuery.data],
  );
  const agendaItems = useMemo(() => sortAgendaItems(buckets), [buckets]);

  // Mobile agenda toggle. Desktop (lg+) always shows the agenda; this controls the < lg state.
  const [agendaShownOnSmall, setAgendaShownOnSmall] = useState(false);

  const retry = (): void => {
    void windowQuery.refetch();
  };

  return (
    <div className="space-y-6 px-4 py-6 md:px-6 md:py-8">
      <PageHeader title={m.page.title} subtitle={m.page.subtitle} />

      <CalendarHeader api={api} />

      {windowQuery.isError &&
        (isNetworkError(windowQuery.error) ? (
          <NetworkErrorState onRetry={retry} />
        ) : (
          <ErrorState
            title={calendarErrorMessage('INTERNAL_ERROR')}
            body={m.errors.body}
            onRetry={retry}
          />
        ))}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {windowQuery.isPending && <GridSkeleton />}

          {windowQuery.isSuccess && agendaItems.length === 0 && (
            <CalendarEmptyState hasFilters={api.hasActiveFilters} />
          )}

          {windowQuery.isSuccess && agendaItems.length > 0 && (
            <CalendarGrid
              windowStart={windowStart}
              windowEnd={windowEnd}
              monthStart={monthStart}
              buckets={buckets}
              platformIndex={platformIndex}
              pillarLabels={pillarLabels}
            />
          )}

          {/* Mobile-only agenda toggle. Hidden on desktop where the side panel is always visible. */}
          {windowQuery.isSuccess && agendaItems.length > 0 && (
            <div className="lg:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAgendaShownOnSmall((prev) => !prev);
                }}
              >
                {agendaShownOnSmall ? m.agenda.toggleHide : m.agenda.toggleShow}
              </Button>
            </div>
          )}
        </div>

        <aside
          className={
            agendaShownOnSmall
              ? 'block rounded-lg border bg-card p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto'
              : 'hidden rounded-lg border bg-card p-4 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto'
          }
        >
          {windowQuery.isPending && <SkeletonList rowCount={4} rowHeight="h-12" />}
          {windowQuery.isSuccess && (
            <CalendarAgenda
              items={agendaItems}
              platformLabels={platformLabels}
              pillarLabels={pillarLabels}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
