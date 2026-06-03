import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { IdeaSchema } from '@shared/schemas/idea';
import { ideasQueryKeys } from './ideas-query-keys';

// Single idea by id. RLS scopes to the owner: another user's id returns no row -> NOT_FOUND.
export function useIdea(id: string) {
  return useQuery({
    queryKey: ideasQueryKeys.detail(id),
    queryFn: async () => {
      const response = await supabase.from('ideas').select('*').eq('id', id).maybeSingle();
      if (response.error) {
        logger.error('idea_get_failed', { code: response.error.code, id });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      if (!response.data) {
        throw new Error(ERROR_CODES.NOT_FOUND);
      }
      const parsed = IdeaSchema.safeParse(response.data);
      if (!parsed.success) {
        logger.error('idea_get_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
    retry: false,
  });
}
