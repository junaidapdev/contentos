import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';
import {
  RepurposeSpawnSchema,
  ContentItemSchema,
  type RepurposeSpawnInput,
} from '@shared/schemas/content-item';
import { mapPgError, type PgErrorPatternMap } from '@/lib/pg-error-mapping';
import { contentItemsQueryKeys } from './content-items-query-keys';

const SpawnResultSchema = z.array(ContentItemSchema);

// Error vocabulary for spawn_repurposed_children (Chunk 07). Kept inline in this hook (rather than
// folded into CONTENT_ITEM_PG_ERRORS in ./errors.ts) because the repurpose tokens overlap with
// the cross-post vocabulary on NOT_AUTHENTICATED + NOT_FOUND only — adding NO_SPECS/TOO_MANY_SPECS
// to the shared list would dilute its specificity. The pattern can be revisited if Chunk 09's
// dashboard or future chunks add another shared token set.
const REPURPOSE_PG_ERRORS: PgErrorPatternMap = [
  { pattern: 'NOT_AUTHENTICATED', code: ERROR_CODES.NOT_AUTHENTICATED },
  { pattern: 'NOT_FOUND', code: ERROR_CODES.NOT_FOUND },
  { pattern: 'NO_SPECS', code: ERROR_CODES.VALIDATION_FAILED },
  { pattern: 'TOO_MANY_SPECS', code: ERROR_CODES.VALIDATION_FAILED },
];

// Wraps the spawn_repurposed_children RPC. Pattern-identical to useSpawnSiblings and
// useSpawnCrossPostVariants: implicit transaction; failure rolls back ALL inserts. Validation is
// layered (RepurposeSpawnSchema client-side, server-side re-checks in the RPC).
export function useSpawnRepurposedChildren() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RepurposeSpawnInput) => {
      const validated = RepurposeSpawnSchema.parse(input);

      const response = await supabase.rpc('spawn_repurposed_children', {
        p_parent_item_id: validated.parent_item_id,
        p_specs: validated.specs,
      });

      if (response.error) {
        const code: ErrorCode = mapPgError(response.error.message, REPURPOSE_PG_ERRORS);
        logger.error('spawn_repurposed_failed', {
          code: response.error.code,
          message: response.error.message,
        });
        throw new Error(code);
      }

      const parsed = SpawnResultSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('spawn_repurposed_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    onSuccess: (_data, vars) => {
      // The parent's detail page now shows N more children; the list family needs to recompute
      // each row's repurposed_children_count + repurposed_from_parent_* badges.
      void queryClient.invalidateQueries({
        queryKey: contentItemsQueryKeys.detail(vars.parent_item_id),
      });
      void queryClient.invalidateQueries({ queryKey: contentItemsQueryKeys.all });
    },
  });
}
