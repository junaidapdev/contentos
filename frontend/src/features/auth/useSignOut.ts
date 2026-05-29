import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';

// Sign-out clears the session AND all cached user data (spec). The caller navigates to /sign-in.
export function useSignOut() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('sign_out_failed', { message: error.message });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
