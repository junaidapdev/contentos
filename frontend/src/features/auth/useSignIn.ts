import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { mapAuthError } from './auth-errors';
import type { SignInInput } from './auth-schemas';

// Email/password sign-in. Throws a stable ERROR_CODES value on failure (e.g. NOT_AUTHENTICATED).
export function useSignIn() {
  return useMutation({
    mutationFn: async (input: SignInInput): Promise<void> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error) {
        logger.warn('sign_in_failed', { status: error.status });
        throw new Error(mapAuthError(error));
      }
    },
  });
}
