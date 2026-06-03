import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import {
  SpawnSiblingsSchema,
  ContentItemSchema,
  type SpawnSiblingsInput,
} from '@shared/schemas/content-item';
import { mapPgError } from '@/lib/pg-error-mapping';
import { ideasQueryKeys } from './ideas-query-keys';
import { contentItemsQueryKeys } from '@/features/content-items/content-items-query-keys';
import { IDEA_PG_ERRORS } from './errors';

const SpawnResultSchema = z.array(ContentItemSchema);

// Wraps the spawn_sibling_content_items RPC. The RPC opens an implicit transaction; any failure
// rolls back ALL inserts (verified manually — see chunk-05 spec, "Acceptance Criteria").
// Validation: SpawnSiblingsSchema runs client-side here as a guardrail, and the RPC re-validates
// length 2..12 server-side. RPC error messages map to stable error codes via the centralized
// lib/pg-error-mapping helper with the IDEA_PG_ERRORS vocabulary (see ./errors.ts).
export function useSpawnSiblings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SpawnSiblingsInput) => {
      const validated = SpawnSiblingsSchema.parse(input);

      // Access response.data directly rather than destructuring (the untyped Supabase RPC client
      // surfaces it as `any`); safeParse accepts unknown and is the boundary where we recover types.
      const response = await supabase.rpc('spawn_sibling_content_items', {
        p_idea_id: validated.idea_id,
        p_specs: validated.specs,
      });

      if (response.error) {
        logger.error('spawn_siblings_failed', {
          code: response.error.code,
          message: response.error.message,
        });
        throw new Error(mapPgError(response.error.message, IDEA_PG_ERRORS));
      }

      const parsed = SpawnResultSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('spawn_siblings_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ideasQueryKeys.spawnedItems(vars.idea_id) });
      void queryClient.invalidateQueries({ queryKey: contentItemsQueryKeys.all });
    },
  });
}
