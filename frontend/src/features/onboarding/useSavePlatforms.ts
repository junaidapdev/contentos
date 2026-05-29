import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { getCurrentUserId } from '@/features/auth/current-user';
import { PlatformSlugSchema, type PlatformSlug } from '@shared/schemas/platform';
import { PLATFORM_LABELS } from './platform-options';

// We Zod-parse the returned rows (the client is untyped for now) so the result is type-safe.
const SavedPlatformSchema = z.object({
  id: z.uuid(),
  slug: PlatformSlugSchema,
  display_name: z.string(),
});
const SavedPlatformsSchema = z.array(SavedPlatformSchema);
export type SavedPlatform = z.infer<typeof SavedPlatformSchema>;

export function useSavePlatforms() {
  return useMutation({
    mutationFn: async (slugs: PlatformSlug[]): Promise<SavedPlatform[]> => {
      const userId = await getCurrentUserId();
      const rows = slugs.map((slug) => ({
        user_id: userId,
        slug,
        display_name: PLATFORM_LABELS[slug],
        is_active: true,
      }));
      // A single array insert is one statement — atomic by Postgres semantics (see decisions.md).
      const { data, error } = await supabase
        .from('platforms')
        .insert(rows)
        .select('id, slug, display_name');
      if (error) {
        logger.error('save_platforms_failed', { message: error.message });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      return SavedPlatformsSchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
    },
  });
}
