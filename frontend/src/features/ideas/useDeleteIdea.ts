import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { ideasQueryKeys } from './ideas-query-keys';
import { contentItemsQueryKeys } from '@/features/content-items/content-items-query-keys';

// Hard delete with confirmation (no optimistic update). Spawned content_items survive: their
// idea_id was declared `on delete set null` in Chunk 02. Sibling relationships among those items
// persist (they reference items, not the idea). The content-items list cache is invalidated so
// the now-orphaned items refetch without their "From idea: …" line.
export function useDeleteIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ideas').delete().eq('id', id);
      if (error) {
        logger.error('idea_delete_failed', { code: error.code, id });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: ideasQueryKeys.detail(id) });
      queryClient.removeQueries({ queryKey: ideasQueryKeys.spawnedItems(id) });
      void queryClient.invalidateQueries({ queryKey: ideasQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: contentItemsQueryKeys.all });
    },
  });
}
