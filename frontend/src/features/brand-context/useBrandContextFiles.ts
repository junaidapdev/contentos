import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import {
  BrandContextFileSchema,
  type BrandContextFile,
} from '@shared/schemas/brand-context-file';
import { brandContextQueryKeys } from './brand-context-query-keys';

const FilesSchema = z.array(BrandContextFileSchema);

// All of the user's brand context files (RLS-scoped). Ordered by updated_at desc so the list
// page can render kind groups with most-recently-edited files first within each group. No
// pagination: an MVP creator has a handful of files, not thousands. If a user with thousands
// surfaces, the list page slowdown is a future concern (documented, out of scope for Chunk 10).
export function useBrandContextFiles() {
  return useQuery({
    queryKey: brandContextQueryKeys.list(),
    queryFn: async (): Promise<BrandContextFile[]> => {
      const { data, error } = await supabase
        .from('brand_context_files')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) {
        logger.error('brand_context_files_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = FilesSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('brand_context_files_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
  });
}
