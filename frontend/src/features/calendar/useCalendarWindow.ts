import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { ContentItemListRowSchema } from '@shared/schemas/content-item';
import { CALENDAR_QUERY_KEY_ROOT, WEEK_START_DAY } from './calendar-constants';
import { formatMonthParam, getCalendarWindow } from './calendar-date-utils';
import type { CalendarFilters } from './useCalendarFilters';

const CalendarRowsSchema = z.array(ContentItemListRowSchema);

// Query key family for the calendar window. Exported so other hooks (e.g., future status-change
// invalidations) can target it precisely. The query key includes the visible month + every
// filter so React Query caches one entry per (month, filters) combination — month navigation +
// filter toggles each get their own cache slot.
export function calendarQueryKey(filters: CalendarFilters) {
  return [
    CALENDAR_QUERY_KEY_ROOT,
    'window',
    {
      month: formatMonthParam(filters.monthYear, filters.monthIndex),
      platformId: filters.platformId,
      pillarId: filters.pillarId,
      statuses: [...filters.statuses].sort(),
    },
  ] as const;
}

// Reads from public.content_items_list_view (Chunk 07). Returns the view rows for items whose
// `scheduled_for` OR `published_at` falls within the visible calendar window (the month padded
// with surrounding days to fill complete weeks), intersected with the status filter and the
// optional platform/pillar filters.
//
// PostgREST OR syntax: the `.or()` filter accepts a comma-separated list of conditions, each of
// which may itself be a parenthesized `and(...)` group. We use:
//   or=(and(scheduled_for.gte.X,scheduled_for.lt.Y),and(published_at.gte.X,published_at.lt.Y))
// — items in the window via EITHER date column. The .in('status', …) further constrains the
// status; together they implement the spec's "status filter intersected with renderable date"
// rule: an item in `'ready'` with `scheduled_for` set still won't appear unless the user picks
// `ready` in the filter — at which point only items in the window are returned (the rendering
// rule then drops items in non-date-bearing statuses; see calendar-grouping.ts).
//
// Performance: a single lightweight log records row count and elapsed ms. Spikes are a signal that
// the view's lateral joins may need tightening (see /context/decisions.md).
export function useCalendarWindow(filters: CalendarFilters) {
  return useQuery({
    queryKey: calendarQueryKey(filters),
    queryFn: async () => {
      const { windowStart, windowEnd } = getCalendarWindow(
        filters.monthYear,
        filters.monthIndex,
        WEEK_START_DAY,
      );

      const startIso = windowStart.toISOString();
      const endIso = windowEnd.toISOString();

      let query = supabase
        .from('content_items_list_view')
        .select('*')
        .or(
          `and(scheduled_for.gte.${startIso},scheduled_for.lt.${endIso}),` +
            `and(published_at.gte.${startIso},published_at.lt.${endIso})`,
        )
        .in('status', [...filters.statuses]);

      if (filters.platformId) query = query.eq('platform_id', filters.platformId);
      if (filters.pillarId) query = query.eq('pillar_id', filters.pillarId);

      const t0 = performance.now();
      const { data, error } = await query;
      const elapsedMs = performance.now() - t0;

      if (error) {
        logger.error('calendar_window_failed', {
          code: error.code,
          message: error.message,
          elapsedMs,
        });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = CalendarRowsSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('calendar_window_invalid_response', {
          issues: parsed.error.issues.length,
          elapsedMs,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      logger.debug('calendar_window_query_complete', {
        rows: parsed.data.length,
        elapsedMs,
        month: formatMonthParam(filters.monthYear, filters.monthIndex),
      });
      return parsed.data;
    },
  });
}
