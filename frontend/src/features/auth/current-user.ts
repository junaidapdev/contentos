import { supabase } from '@/lib/supabase';
import { ERROR_CODES } from '@/constants/error-codes';

// Resolves the authenticated user's id for inserts (RLS requires user_id = auth.uid() on every row).
export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(ERROR_CODES.NOT_AUTHENTICATED);
  }
  return data.user.id;
}
