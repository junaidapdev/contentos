import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';

const RowSchema = z.object({ idea_id: z.uuid() });
const RowsSchema = z.array(RowSchema);

// Returns a Map<ideaId, count> for the given ideaIds. One batched query — avoids per-row N+1.
// Fetches a thin (idea_id) projection and tallies client-side; cheaper than per-idea HEAD counts
// for the page-size 25 list. Empty Map when ideaIds is empty (no query fires).
export function useIdeasSpawnedCounts(ideaIds: ReadonlyArray<string>) {
  const enabled = ideaIds.length > 0;
  const stableKey = enabled ? [...ideaIds].sort() : [];

  const query = useQuery({
    queryKey: ['ideas', 'spawned-counts', stableKey],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_items')
        .select('idea_id')
        .in('idea_id', ideaIds);
      if (error) {
        logger.error('ideas_spawned_counts_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = RowsSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('ideas_spawned_counts_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      const counts = new Map<string, number>();
      for (const row of parsed.data) {
        counts.set(row.idea_id, (counts.get(row.idea_id) ?? 0) + 1);
      }
      return counts;
    },
  });

  return query.data ?? new Map<string, number>();
}
