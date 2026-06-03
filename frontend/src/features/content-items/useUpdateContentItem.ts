import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import {
  ContentItemSchema,
  type ContentItem,
  type ContentItemFormat,
} from '@shared/schemas/content-item';
import { contentItemsQueryKeys } from './content-items-query-keys';

// Non-status field edits only. Status changes go through useUpdateContentItemStatus (the RPC).
export interface ContentItemUpdatePayload {
  title?: string;
  format?: ContentItemFormat;
  platform_id?: string | null;
  pillar_id?: string | null;
  idea_id?: string | null;
  published_url?: string | null;
  notes?: string | null;
  scheduled_for?: string | null;
  published_at?: string | null;
}

interface OptimisticContext {
  previous: ContentItem | undefined;
}

export function useUpdateContentItem(id: string) {
  const queryClient = useQueryClient();
  const detailKey = contentItemsQueryKeys.detail(id);

  return useMutation({
    mutationFn: async (payload: ContentItemUpdatePayload) => {
      const response = await supabase
        .from('content_items')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (response.error) {
        logger.error('content_item_update_failed', { code: response.error.code, id });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = ContentItemSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('content_item_update_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    // Optimistic: reflect the edit on the detail cache immediately; roll back on error.
    onMutate: async (payload): Promise<OptimisticContext> => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<ContentItem>(detailKey);
      if (previous) {
        queryClient.setQueryData<ContentItem>(detailKey, { ...previous, ...payload });
      }
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(detailKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: contentItemsQueryKeys.all });
    },
  });
}
