import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

export interface OnboardingStatus {
  hasPlatforms: boolean;
  hasPillars: boolean;
  isOnboarded: boolean;
}

// Onboarding completion is DERIVED, not a flag: a user is onboarded once they have >= 1 platform
// AND >= 1 pillar (see /context/decisions.md). Counts use Postgres `count` (head: true → no rows
// transferred). RLS scopes the counts to the current user. Cached with a 5-minute staleTime.
export function useOnboardingStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['onboarding-status', user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<OnboardingStatus> => {
      const [platforms, pillars] = await Promise.all([
        supabase.from('platforms').select('id', { count: 'exact', head: true }),
        supabase.from('content_pillars').select('id', { count: 'exact', head: true }),
      ]);
      if (platforms.error) throw new Error(platforms.error.message);
      if (pillars.error) throw new Error(pillars.error.message);

      const hasPlatforms = (platforms.count ?? 0) > 0;
      const hasPillars = (pillars.count ?? 0) > 0;
      return { hasPlatforms, hasPillars, isOnboarded: hasPlatforms && hasPillars };
    },
  });
}
