import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  CONTENT_ITEM_STATUS_VALUES,
  type ContentItemStatus,
} from '@shared/schemas/content-item';
import {
  formatMonthParam,
  nextMonth,
  parseMonthParam,
  previousMonth,
} from './calendar-date-utils';

const DEFAULT_STATUSES: ReadonlyArray<ContentItemStatus> = ['scheduled', 'published'];

export interface CalendarFilters {
  monthYear: number;
  monthIndex: number;
  platformId: string | null;
  pillarId: string | null;
  statuses: ReadonlyArray<ContentItemStatus>;
}

export interface CalendarFiltersApi {
  filters: CalendarFilters;
  // Whether the current statuses array matches the default. Drives the "Reset to default" item.
  isDefaultStatuses: boolean;
  // Whether ANY non-default filter is active (status set differs from default, platform/pillar set,
  // and so on). Drives the "Clear filters" affordance and the filtered-vs-unfiltered empty state.
  hasActiveFilters: boolean;
  setMonth: (year: number, monthIndex: number) => void;
  goPreviousMonth: () => void;
  goNextMonth: () => void;
  goToday: () => void;
  setPlatformId: (id: string | null) => void;
  setPillarId: (id: string | null) => void;
  setStatuses: (statuses: ReadonlyArray<ContentItemStatus>) => void;
  resetStatusesToDefault: () => void;
  clearFilters: () => void;
}

// Parse a `?statuses=scheduled,published` param into a typed array. Unknown tokens are dropped
// silently — URL hacking benign. Empty input → default ['scheduled', 'published'].
function parseStatusesParam(raw: string | null): ReadonlyArray<ContentItemStatus> {
  if (!raw) return DEFAULT_STATUSES;
  const tokens = raw.split(',').map((t) => t.trim());
  const valid = tokens.filter((t): t is ContentItemStatus =>
    (CONTENT_ITEM_STATUS_VALUES as ReadonlyArray<string>).includes(t),
  );
  return valid.length === 0 ? DEFAULT_STATUSES : valid;
}

function sameStatusSet(
  a: ReadonlyArray<ContentItemStatus>,
  b: ReadonlyArray<ContentItemStatus>,
): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const v of b) if (!setA.has(v)) return false;
  return true;
}

// URL-state-backed filter bag. The URL is the single source of truth: refresh and back/forward
// preserve every filter (per the chunk spec). React Query's queryKey is derived from this so
// changing a filter is a cache hit miss + fresh fetch.
//
// Defaults:
//   month     → current local month
//   statuses  → ['scheduled', 'published']
//   platform  → null (any)
//   pillar    → null (any)
export function useCalendarFilters(): CalendarFiltersApi {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: CalendarFilters = useMemo(() => {
    const parsedMonth = parseMonthParam(searchParams.get('month'));
    const now = new Date();
    const year = parsedMonth?.year ?? now.getFullYear();
    const monthIndex = parsedMonth?.monthIndex ?? now.getMonth();
    const statuses = parseStatusesParam(searchParams.get('statuses'));
    const platformId = searchParams.get('platform_id');
    const pillarId = searchParams.get('pillar_id');
    return {
      monthYear: year,
      monthIndex,
      platformId: platformId && platformId.length > 0 ? platformId : null,
      pillarId: pillarId && pillarId.length > 0 ? pillarId : null,
      statuses,
    };
  }, [searchParams]);

  // Single mutation helper to keep setMonth/clearFilters/etc. consistent (all of them edit URL
  // params in place; React Router's setSearchParams accepts a function).
  const update = useCallback(
    (mutator: (params: URLSearchParams) => void): void => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutator(next);
          // React Router search-param updates are navigations; skip true no-op updates.
          return next.toString() === prev.toString() ? prev : next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const setMonth = useCallback(
    (year: number, monthIndex: number): void => {
      update((p) => {
        p.set('month', formatMonthParam(year, monthIndex));
      });
    },
    [update],
  );

  const goPreviousMonth = useCallback((): void => {
    const { year, monthIndex } = previousMonth(filters.monthYear, filters.monthIndex);
    setMonth(year, monthIndex);
  }, [filters.monthYear, filters.monthIndex, setMonth]);

  const goNextMonth = useCallback((): void => {
    const { year, monthIndex } = nextMonth(filters.monthYear, filters.monthIndex);
    setMonth(year, monthIndex);
  }, [filters.monthYear, filters.monthIndex, setMonth]);

  const goToday = useCallback((): void => {
    const now = new Date();
    update((p) => {
      // Use formatMonthParam directly: setMonth depends on `filters.*`, which would re-render
      // before the URL changes. Reading `now` and writing both atomically here is simpler.
      p.set('month', formatMonthParam(now.getFullYear(), now.getMonth()));
    });
  }, [update]);

  const setPlatformId = useCallback(
    (id: string | null): void => {
      update((p) => {
        if (id) p.set('platform_id', id);
        else p.delete('platform_id');
      });
    },
    [update],
  );

  const setPillarId = useCallback(
    (id: string | null): void => {
      update((p) => {
        if (id) p.set('pillar_id', id);
        else p.delete('pillar_id');
      });
    },
    [update],
  );

  const setStatuses = useCallback(
    (statuses: ReadonlyArray<ContentItemStatus>): void => {
      update((p) => {
        if (sameStatusSet(statuses, DEFAULT_STATUSES)) {
          p.delete('statuses');
        } else {
          p.set('statuses', statuses.join(','));
        }
      });
    },
    [update],
  );

  const resetStatusesToDefault = useCallback((): void => {
    setStatuses(DEFAULT_STATUSES);
  }, [setStatuses]);

  const clearFilters = useCallback((): void => {
    update((p) => {
      p.delete('statuses');
      p.delete('platform_id');
      p.delete('pillar_id');
      // Keep `month` — the visible window is navigation state, not a filter.
    });
  }, [update]);

  const isDefaultStatuses = sameStatusSet(filters.statuses, DEFAULT_STATUSES);
  const hasActiveFilters =
    !isDefaultStatuses || filters.platformId !== null || filters.pillarId !== null;

  return {
    filters,
    isDefaultStatuses,
    hasActiveFilters,
    setMonth,
    goPreviousMonth,
    goNextMonth,
    goToday,
    setPlatformId,
    setPillarId,
    setStatuses,
    resetStatusesToDefault,
    clearFilters,
  };
}

// Re-exported for the chip popover / agenda (defensive: a constant shared between filter logic
// and display logic so they can't drift).
export { DEFAULT_STATUSES };
