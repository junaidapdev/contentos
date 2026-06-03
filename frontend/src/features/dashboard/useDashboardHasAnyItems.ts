import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { useAuth } from '@/features/auth/useAuth';
import { DASHBOARD_QUERY_KEY_ROOT } from './dashboard-constants';

// Thin HEAD count query for "does the user have any content items at all?" Drives the
// first-run empty state on the dashboard. RLS scopes the count to the calling user. Long
// staleTime (5 min) because the answer flips at most once per session (the first item
// creation); subsequent dashboard renders use the cached `true`.
export function useDashboardHasAnyItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY_ROOT, 'has-any-items', user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { count, error } = await supabase
        .from('content_items')
        .select('id', { count: 'exact', head: true });
      if (error) {
        logger.error('dashboard_has_any_items_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      return (count ?? 0) > 0;
    },
  });
}
