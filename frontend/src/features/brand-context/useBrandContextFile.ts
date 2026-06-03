import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { BrandContextFileSchema } from '@shared/schemas/brand-context-file';
import { brandContextQueryKeys } from './brand-context-query-keys';

// Single brand context file by id. RLS scopes to the owner: another user's id returns no row →
// NOT_FOUND. Same pattern as useIdea / useContentItem.
export function useBrandContextFile(id: string) {
  return useQuery({
    queryKey: brandContextQueryKeys.detail(id),
    queryFn: async () => {
      const response = await supabase
        .from('brand_context_files')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (response.error) {
        logger.error('brand_context_file_get_failed', { code: response.error.code, id });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      if (!response.data) {
        throw new Error(ERROR_CODES.NOT_FOUND);
      }
      const parsed = BrandContextFileSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('brand_context_file_get_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    retry: false,
  });
}
