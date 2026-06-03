import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import {
  ContentItemSchema,
  type ContentItem,
  type ContentItemStatus,
} from '@shared/schemas/content-item';
import { mapPgError } from '@/lib/pg-error-mapping';
import { contentItemsQueryKeys } from './content-items-query-keys';
import { CONTENT_ITEM_PG_ERRORS } from './errors';

// Status changes route through the update_content_item_status RPC, which enforces the transition
// table + date requirements server-side (defense in depth alongside the Zod refinement).
export interface StatusChangeInput {
  newStatus: ContentItemStatus;
  scheduledFor?: string | null;
  publishedAt?: string | null;
}

interface OptimisticContext {
  previous: ContentItem | undefined;
}

export function useUpdateContentItemStatus(id: string) {
  const queryClient = useQueryClient();
  const detailKey = contentItemsQueryKeys.detail(id);

  return useMutation({
    mutationFn: async ({ newStatus, scheduledFor, publishedAt }: StatusChangeInput) => {
      const response = await supabase.rpc('update_content_item_status', {
        p_item_id: id,
        p_new_status: newStatus,
        p_scheduled_for: scheduledFor ?? null,
        p_published_at: publishedAt ?? null,
      });
      if (response.error) {
        logger.error('content_item_status_failed', { code: response.error.code, id });
        throw new Error(mapPgError(response.error.message, CONTENT_ITEM_PG_ERRORS));
      }
      const parsed = ContentItemSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('content_item_status_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    onMutate: async ({ newStatus, scheduledFor, publishedAt }): Promise<OptimisticContext> => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<ContentItem>(detailKey);
      if (previous) {
        queryClient.setQueryData<ContentItem>(detailKey, {
          ...previous,
          status: newStatus,
          scheduled_for:
            newStatus === 'scheduled'
              ? (scheduledFor ?? previous.scheduled_for)
              : previous.scheduled_for,
          published_at:
            newStatus === 'published'
              ? (publishedAt ?? previous.published_at)
              : previous.published_at,
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
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
