import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { useAuth } from '@/features/auth/useAuth';
import { ContentPillarSchema } from '@shared/schemas/content-pillar';
import { DASHBOARD_QUERY_KEY_ROOT } from './dashboard-constants';

const PillarsSchema = z.array(ContentPillarSchema);

// Dashboard-local pillars query. Separate from the general usePillars (features/pillars) only
// because of the 5-minute staleTime — pillars change rarely and the dashboard fetches them on
// every panel-data computation. Could be consolidated later if the wider pillars hook is
// promoted to the same staleTime.
export function useDashboardPillars() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY_ROOT, 'pillars', user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_pillars')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) {
        logger.error('dashboard_pillars_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = PillarsSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('dashboard_pillars_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
  });
}
