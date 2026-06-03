import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { ContentItemListRowSchema } from '@shared/schemas/content-item';
import {
  DASHBOARD_QUERY_KEY_ROOT,
  DASHBOARD_WINDOW_OPTIONS,
  type DashboardWindowValue,
} from './dashboard-constants';

const DashboardRowsSchema = z.array(ContentItemListRowSchema);

export interface DashboardWindowResult {
  rows: import('@shared/schemas/content-item').ContentItemListRow[];
  windowStart: Date;
  windowEnd: Date;
  days: number;
}

// Pulls every row from content_items_list_view where ANY of created_at / scheduled_for /
// published_at falls in the trailing N-day window. The three OR conditions cover the union of
// rows the four panels need:
//   - status mix counts rows by created_at
//   - pillar balance + cadence + empty cells count rows by status (scheduled/published) which
//     implicitly carry scheduled_for/published_at in-window via the calendar's same rule, but
//     also need created_at-only rows that became scheduled afterwards
//
// One round-trip; all four panels read the same rows. Same PostgREST OR-of-AND syntax verified
// in Chunk 08. If it ever proves brittle (URL length, Supabase JS encoding change), fall back
// to three separate queries + client-side dedup by `id` — documented in decisions.md.
export function useDashboardWindow(windowValue: DashboardWindowValue) {
  const days =
    DASHBOARD_WINDOW_OPTIONS.find((o) => o.value === windowValue)?.days ?? 30;

  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY_ROOT, 'window', windowValue],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<DashboardWindowResult> => {
      const windowEnd = new Date();
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - days);

      const startIso = windowStart.toISOString();
      const endIso = windowEnd.toISOString();

      const t0 = performance.now();
      const { data, error } = await supabase
        .from('content_items_list_view')
        .select('*')
        .or(
          `and(created_at.gte.${startIso},created_at.lt.${endIso}),` +
            `and(scheduled_for.gte.${startIso},scheduled_for.lt.${endIso}),` +
            `and(published_at.gte.${startIso},published_at.lt.${endIso})`,
        );
      const elapsedMs = performance.now() - t0;

      if (error) {
        logger.error('dashboard_window_failed', {
          code: error.code,
          message: error.message,
          elapsedMs,
        });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = DashboardRowsSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('dashboard_window_invalid_response', {
          issues: parsed.error.issues.length,
          elapsedMs,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      logger.debug('dashboard_window_query_complete', {
        rows: parsed.data.length,
        elapsedMs,
        windowValue,
      });
      return { rows: parsed.data, windowStart, windowEnd, days };
    },
  });
}
