import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { useAuth } from '@/features/auth/useAuth';
import { ContentPillarSchema } from '@shared/schemas/content-pillar';

const PillarsSchema = z.array(ContentPillarSchema);

// The signed-in user's content pillars (RLS scopes to the owner). Used by content-item forms.
export function usePillars() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pillars', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_pillars')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) {
        logger.error('pillars_list_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = PillarsSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('pillars_list_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
  });
}
