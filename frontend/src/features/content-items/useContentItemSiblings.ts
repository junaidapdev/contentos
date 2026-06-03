import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { ContentItemSchema } from '@shared/schemas/content-item';
import { contentItemsQueryKeys } from './content-items-query-keys';

const ItemsSchema = z.array(ContentItemSchema);

// Wraps get_content_item_relations(p_item_id, 'sibling'). Chunk 06 generalized Chunk 05's
// dedicated get_content_item_siblings function into a relationship_type-parameterized helper,
// so the frontend now passes the discriminator explicitly. The hook name stays siblings-specific
// — the call site cares about siblings; cross-posts use useCrossPostGroup, which calls the same
// RPC with relationship_type='cross_post'.
//
// RLS scopes the result to the caller; SQL handles both hub-as-input and spoke-as-input cases.
// The returned list never includes the input item.
export function useContentItemSiblings(itemId: string) {
  return useQuery({
    queryKey: [...contentItemsQueryKeys.detail(itemId), 'siblings'] as const,
    enabled: Boolean(itemId),
    queryFn: async () => {
      const response = await supabase.rpc('get_content_item_relations', {
        p_item_id: itemId,
        p_relationship_type: 'sibling',
      });
      if (response.error) {
        logger.error('content_item_siblings_failed', { code: response.error.code, itemId });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = ItemsSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('content_item_siblings_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
  });
}
