import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { brandContextQueryKeys } from './brand-context-query-keys';

// Hard delete with confirmation (no optimistic update). On success removes the detail cache and
// invalidates the list family.
export function useDeleteBrandContextFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_context_files').delete().eq('id', id);
      if (error) {
        logger.error('brand_context_file_delete_failed', { code: error.code, id });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: brandContextQueryKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: brandContextQueryKeys.all });
    },
  });
}
