import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { getCurrentUserId } from '@/features/auth/current-user';
import { ContentItemSchema, type ContentItemCreateInput } from '@shared/schemas/content-item';
import { contentItemsQueryKeys } from './content-items-query-keys';

// Create always starts a row at status 'idea' (status is not a create-form field). No optimistic
// update — create is infrequent and benefits from a confirmed server response.
export function useCreateContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ContentItemCreateInput) => {
      const userId = await getCurrentUserId();
      const response = await supabase
        .from('content_items')
        .insert({
          user_id: userId,
          title: input.title,
          format: input.format,
          platform_id: input.platform_id ?? null,
          pillar_id: input.pillar_id ?? null,
          idea_id: input.idea_id ?? null,
          notes: input.notes ?? null,
          scheduled_for: input.scheduled_for ?? null,
          status: 'idea',
        })
        .select('*')
        .single();
      if (response.error) {
        logger.error('content_item_create_failed', { code: response.error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = ContentItemSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('content_item_create_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contentItemsQueryKeys.all });
    },
  });
}
