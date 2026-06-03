import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { getCurrentUserId } from '@/features/auth/current-user';
import {
  BrandContextFileSchema,
  type BrandContextFileCreateInput,
} from '@shared/schemas/brand-context-file';
import { brandContextQueryKeys } from './brand-context-query-keys';

// Insert a brand context file. No optimistic update — create is infrequent and benefits from a
// confirmed server response. Invalidate the list family on success.
export function useCreateBrandContextFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BrandContextFileCreateInput) => {
      const userId = await getCurrentUserId();
      const response = await supabase
        .from('brand_context_files')
        .insert({
          user_id: userId,
          kind: input.kind,
          title: input.title,
          body: input.body,
        })
        .select('*')
        .single();
      if (response.error) {
        logger.error('brand_context_file_create_failed', { code: response.error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = BrandContextFileSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('brand_context_file_create_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: brandContextQueryKeys.all });
    },
  });
}
