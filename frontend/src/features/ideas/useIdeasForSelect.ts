import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { useAuth } from '@/features/auth/useAuth';
import { ideasQueryKeys } from './ideas-query-keys';

// Lightweight (id, title) projection for the content-item form's optional Idea select.
// Separate from useIdeasList so the (paginated, full-payload) list cache isn't fetched just to
// fill a dropdown. RLS scopes to the owner.
const IdeaOptionSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(300),
});
const IdeaOptionsSchema = z.array(IdeaOptionSchema);

export type IdeaOption = z.infer<typeof IdeaOptionSchema>;

export function useIdeasForSelect() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ideasQueryKeys.selectList(),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ideas')
        .select('id, title')
        .order('updated_at', { ascending: false });
      if (error) {
        logger.error('ideas_select_list_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = IdeaOptionsSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('ideas_select_list_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
  });
}
