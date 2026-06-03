import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { ContentItemSchema } from '@shared/schemas/content-item';
import { contentItemsQueryKeys } from './content-items-query-keys';

// Single content item by id. RLS scopes to the owner: another user's id returns no row -> NOT_FOUND.
export function useContentItem(id: string) {
  return useQuery({
    queryKey: contentItemsQueryKeys.detail(id),
    queryFn: async () => {
      // Access response.data (untyped client -> any) directly rather than binding it to a variable,
      // which would trip no-unsafe-assignment. safeParse accepts unknown.
      const response = await supabase.from('content_items').select('*').eq('id', id).maybeSingle();
      if (response.error) {
        logger.error('content_item_get_failed', { code: response.error.code, id });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      if (!response.data) {
        throw new Error(ERROR_CODES.NOT_FOUND);
      }
      const parsed = ContentItemSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('content_item_get_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    retry: false,
  });
}
