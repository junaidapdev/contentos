import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { contentItemsQueryKeys } from './content-items-query-keys';

// Hard delete with confirmation (no optimistic update — delete is infrequent and benefits from a
// confirmed response). The on-delete-cascade from Chunk 02 cleans up content_relationships rows.
export function useDeleteContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('content_items').delete().eq('id', id);
      if (error) {
        logger.error('content_item_delete_failed', { code: error.code, id });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: contentItemsQueryKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: contentItemsQueryKeys.all });
    },
  });
}
