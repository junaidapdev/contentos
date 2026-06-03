import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { useAuth } from '@/features/auth/useAuth';
import { PlatformSchema } from '@shared/schemas/platform';

const PlatformsSchema = z.array(PlatformSchema);

// The signed-in user's active platforms (RLS scopes to the owner). Used by content-item forms.
export function usePlatforms() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['platforms', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('display_name', { ascending: true });
      if (error) {
        logger.error('platforms_list_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = PlatformsSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('platforms_list_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data;
    },
  });
}
