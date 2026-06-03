import { createClient } from 'npm:@supabase/supabase-js@2';
import { RATE_LIMIT_PER_MINUTE, RATE_LIMIT_PER_DAY } from './anthropic-config.ts';

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: 'minute' | 'day';
  resetSeconds?: number;
}

// Counts the caller's ai_request_log rows in the trailing minute, then the trailing day, against
// the per-minute / per-day caps. Uses the SERVICE ROLE client (RLS would otherwise block reading
// rows the caller can't insert; also the count must be authoritative, not RLS-scoped to the
// caller's own SELECT policy — though here they coincide). Minute is checked first.
//
// Check-then-act: a tiny race window exists (a user firing 21 requests within ~60ms could slip
// past). Not a realistic abuse vector for an interactive "suggest" button; documented in
// decisions.md. Fails OPEN on a lookup error — we don't block real users on infra hiccups.
export async function checkRateLimit(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
): Promise<RateLimitCheckResult> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const oneMinuteAgoIso = new Date(Date.now() - 60_000).toISOString();
  const oneDayAgoIso = new Date(Date.now() - 86_400_000).toISOString();

  const { count: lastMinuteCount, error: minuteError } = await supabase
    .from('ai_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneMinuteAgoIso);

  if (minuteError) return { allowed: true };
  if ((lastMinuteCount ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, reason: 'minute', resetSeconds: 60 };
  }

  const { count: lastDayCount, error: dayError } = await supabase
    .from('ai_request_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneDayAgoIso);

  if (dayError) return { allowed: true };
  if ((lastDayCount ?? 0) >= RATE_LIMIT_PER_DAY) {
    return { allowed: false, reason: 'day', resetSeconds: 86_400 };
  }

  return { allowed: true };
}
