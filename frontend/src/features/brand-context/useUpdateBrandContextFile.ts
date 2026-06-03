import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import {
  BrandContextFileSchema,
  type BrandContextFile,
  type BrandContextKind,
} from '@shared/schemas/brand-context-file';
import { brandContextQueryKeys } from './brand-context-query-keys';

// Partial-update payload mirrors BrandContextFileUpdateSchema's column-level shape.
export interface BrandContextFileUpdatePayload {
  kind?: BrandContextKind;
  title?: string;
  body?: string;
}

interface OptimisticContext {
  previous: BrandContextFile | undefined;
}

// Optimistic update on the detail cache; rollback on error. Same pattern as useUpdateIdea.
export function useUpdateBrandContextFile(id: string) {
  const queryClient = useQueryClient();
  const detailKey = brandContextQueryKeys.detail(id);

  return useMutation({
    mutationFn: async (payload: BrandContextFileUpdatePayload) => {
      const response = await supabase
        .from('brand_context_files')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (response.error) {
        logger.error('brand_context_file_update_failed', { code: response.error.code, id });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = BrandContextFileSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('brand_context_file_update_invalid_response', {
          issues: parsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    onMutate: async (payload): Promise<OptimisticContext> => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<BrandContextFile>(detailKey);
      if (previous) {
        queryClient.setQueryData<BrandContextFile>(detailKey, { ...previous, ...payload });
      }
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(detailKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: brandContextQueryKeys.all });
    },
  });
}
