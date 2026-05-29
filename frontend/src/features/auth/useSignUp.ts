import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { mapAuthError } from './auth-errors';
import type { SignUpInput } from './auth-schemas';

// Email/password sign-up. With email confirmations disabled (Chunk 02 local config), signUp returns
// a live session, so callers can route straight to onboarding. Throws a stable ERROR_CODES value.
export function useSignUp() {
  return useMutation({
    mutationFn: async (input: SignUpInput): Promise<void> => {
      const { error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
      });
      if (error) {
        logger.warn('sign_up_failed', { status: error.status });
        throw new Error(mapAuthError(error));
      }
    },
  });
}
