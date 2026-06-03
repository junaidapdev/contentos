import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { getCurrentUserId } from '@/features/auth/current-user';
import { IdeaSchema, type IdeaCreateInput } from '@shared/schemas/idea';
import { ideasQueryKeys } from './ideas-query-keys';

// Same pattern as useCreateContentItem: no optimistic update, invalidate the list family on success.
export function useCreateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: IdeaCreateInput) => {
      const userId = await getCurrentUserId();
      const response = await supabase
        .from('ideas')
        .insert({
          user_id: userId,
          title: input.title,
          notes: input.notes ?? null,
          pillar_id: input.pillar_id ?? null,
        })
        .select('*')
        .single();
      if (response.error) {
        logger.error('idea_create_failed', { code: response.error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = IdeaSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('idea_create_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ideasQueryKeys.all });
    },
  });
}
