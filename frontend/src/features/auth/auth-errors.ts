import type { AuthError } from '@supabase/supabase-js';
import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';

const KNOWN_CODES = new Set<string>(Object.values(ERROR_CODES));

// Map a Supabase AuthError to a stable ContentEngine error code (thrown by the mutation hooks).
export function mapAuthError(error: AuthError): ErrorCode {
  if (error.code === 'user_already_exists' || error.status === 409) return ERROR_CODES.CONFLICT;
  if (error.status === 400 || error.status === 401) return ERROR_CODES.NOT_AUTHENTICATED;
  if (error.status === 422) return ERROR_CODES.VALIDATION_FAILED;
  if (error.status === 429) return ERROR_CODES.RATE_LIMITED;
  return ERROR_CODES.INTERNAL_ERROR;
}

// Normalize any thrown/rejected value into a stable error code. A mutation that already threw a
// coded Error keeps its code; anything else (e.g. a network rejection) becomes NETWORK_ERROR.
export function toErrorCode(value: unknown): ErrorCode {
  if (value instanceof Error && KNOWN_CODES.has(value.message)) {
    return value.message as ErrorCode;
  }
  return ERROR_CODES.NETWORK_ERROR;
}
