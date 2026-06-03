import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { IdeaSchema, type Idea } from '@shared/schemas/idea';
import { ideasQueryKeys } from './ideas-query-keys';

// Partial-update payload mirrors the @shared IdeaUpdateSchema's column-level shape.
export interface IdeaUpdatePayload {
  title?: string;
  notes?: string | null;
  pillar_id?: string | null;
}

interface OptimisticContext {
  previous: Idea | undefined;
}

export function useUpdateIdea(id: string) {
  const queryClient = useQueryClient();
  const detailKey = ideasQueryKeys.detail(id);

  return useMutation({
    mutationFn: async (payload: IdeaUpdatePayload) => {
      const response = await supabase
        .from('ideas')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (response.error) {
        logger.error('idea_update_failed', { code: response.error.code, id });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = IdeaSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('idea_update_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    // Optimistic: reflect the edit on the detail cache immediately; roll back on error.
    onMutate: async (payload): Promise<OptimisticContext> => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<Idea>(detailKey);
      if (previous) {
        queryClient.setQueryData<Idea>(detailKey, { ...previous, ...payload });
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
      void queryClient.invalidateQueries({ queryKey: ideasQueryKeys.all });
    },
  });
}
