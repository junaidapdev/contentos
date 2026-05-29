import { createClient } from '@supabase/supabase-js';
import { ENV } from '@/constants/env';

// The anon/publishable key is public by design; RLS is the authorization perimeter (see
// /context/02-architecture.md, "Security Boundaries"). Session persists in localStorage (Supabase
// default) — acceptable for an SPA; a CSP lands in Chunk 13. A typed `Database` generic is a
// deferred enhancement (run `supabase gen types typescript`); see /context/decisions.md.
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
