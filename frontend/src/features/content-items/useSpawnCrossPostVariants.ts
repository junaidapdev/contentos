import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import {
  CrossPostSpawnSchema,
  ContentItemSchema,
  type CrossPostSpawnInput,
} from '@shared/schemas/content-item';
import { mapPgError } from '@/lib/pg-error-mapping';
import { contentItemsQueryKeys } from './content-items-query-keys';
import { CONTENT_ITEM_PG_ERRORS } from './errors';

const SpawnResultSchema = z.array(ContentItemSchema);

// Wraps the spawn_cross_post_variants RPC (Chunk 06). Pattern-identical to useSpawnSiblings:
// the RPC opens an implicit transaction; any failure rolls back ALL inserts. Validation is
// layered (CrossPostSpawnSchema client-side, server-side re-checks in the RPC).
//
// Error mapping: cross-post-specific tokens (SOURCE_LACKS_PLATFORM, PLATFORM_ALREADY_COVERED,
// TARGET_INCLUDES_SOURCE_PLATFORM, INVALID_PLATFORM, NO_TARGET_PLATFORMS, TOO_MANY_PLATFORMS) live
// in the shared CONTENT_ITEM_PG_ERRORS vocabulary (Chunk 06: see ./errors.ts) which is consumed
// via the centralized lib/pg-error-mapping helper.
export function useSpawnCrossPostVariants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CrossPostSpawnInput) => {
      const validated = CrossPostSpawnSchema.parse(input);

      const response = await supabase.rpc('spawn_cross_post_variants', {
        p_source_item_id: validated.source_item_id,
        p_target_platform_ids: validated.target_platform_ids,
      });

      if (response.error) {
        logger.error('spawn_cross_post_failed', {
          code: response.error.code,
          message: response.error.message,
        });
        throw new Error(mapPgError(response.error.message, CONTENT_ITEM_PG_ERRORS));
      }

      const parsed = SpawnResultSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('spawn_cross_post_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    onSuccess: (_data, vars) => {
      // Refresh the source's detail page (its cross-post group changed) AND the list family
      // (the new children are list entries; their group_size badges need to render too).
      void queryClient.invalidateQueries({
        queryKey: contentItemsQueryKeys.detail(vars.source_item_id),
      });
      void queryClient.invalidateQueries({ queryKey: contentItemsQueryKeys.all });
    },
  });
}
