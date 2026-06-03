import { useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { IdeaSchema } from '@shared/schemas/idea';
import { ideasQueryKeys } from './ideas-query-keys';

export const IDEAS_PAGE_SIZE = 25;
const IdeasListSchema = z.array(IdeaSchema);

// Cursor pagination on updated_at desc — same pattern as useContentItemsList (Chunk 04).
// Distinct insert timestamps make skips/dups a non-issue in practice; a composite (updated_at,id)
// cursor is a future refinement once we observe collisions.
export function useIdeasList() {
  return useInfiniteQuery({
    queryKey: ideasQueryKeys.list(),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('ideas')
        .select('*')
        .order('updated_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(IDEAS_PAGE_SIZE);

      if (pageParam) query = query.lt('updated_at', pageParam);

      const { data, error } = await query;
      if (error) {
        logger.error('ideas_list_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = IdeasListSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('ideas_list_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === IDEAS_PAGE_SIZE ? lastPage[lastPage.length - 1]?.updated_at : undefined,
  });
}
