import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { getCurrentUserId } from '@/features/auth/current-user';

export function useSavePillars() {
  return useMutation({
    mutationFn: async (names: string[]): Promise<void> => {
      const userId = await getCurrentUserId();
      const rows = names.map((name, index) => ({
        user_id: userId,
        name,
        sort_order: index,
      }));
      const { error } = await supabase.from('content_pillars').insert(rows);
      if (error) {
        logger.error('save_pillars_failed', { message: error.message });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
    },
  });
}
