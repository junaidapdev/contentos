import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { useAuth } from '@/features/auth/useAuth';
import { CadenceTargetSchema } from '@shared/schemas/cadence-target';
import { DASHBOARD_QUERY_KEY_ROOT } from './dashboard-constants';

const TargetsSchema = z.array(CadenceTargetSchema);

// Cadence targets. Returns the raw rows from cadence_targets; the panel resolves platform
// display names via the existing usePlatforms hook. Avoids a JOIN-shaped query so the response
// remains a clean validate-against-CadenceTargetSchema array. 5-minute staleTime because
// targets change rarely (onboarding-set, possibly edited in Settings).
export function useDashboardCadenceTargets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY_ROOT, 'cadence-targets', user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cadence_targets')
        .select('*')
        .order('weekly_target', { ascending: false });
      if (error) {
        logger.error('dashboard_cadence_targets_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = TargetsSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('dashboard_cadence_targets_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
  });
}
