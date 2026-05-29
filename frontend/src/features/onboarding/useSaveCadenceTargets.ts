import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { getCurrentUserId } from '@/features/auth/current-user';

export interface CadenceTargetInput {
  platformId: string;
  weeklyTarget: number;
}

export function useSaveCadenceTargets() {
  return useMutation({
    mutationFn: async (targets: CadenceTargetInput[]): Promise<void> => {
      const userId = await getCurrentUserId();
      const rows = targets.map((target) => ({
        user_id: userId,
        platform_id: target.platformId,
        weekly_target: target.weeklyTarget,
      }));
      // Upsert keyed on the (user_id, platform_id) unique constraint — idempotent if re-run.
      const { error } = await supabase
        .from('cadence_targets')
        .upsert(rows, { onConflict: 'user_id,platform_id' });
      if (error) {
        logger.error('save_cadence_failed', { message: error.message });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
    },
  });
}
