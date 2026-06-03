import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';

const KNOWN_CODES = new Set<string>(Object.values(ERROR_CODES));

// Normalize a thrown/rejected value (hooks throw new Error(code)) into a stable error code.
// Mirrors the pattern in features/content-items/errors.ts and features/ideas/errors.ts.
export function toBrandContextErrorCode(value: unknown): ErrorCode {
  if (value instanceof Error && KNOWN_CODES.has(value.message)) {
    return value.message as ErrorCode;
  }
  return ERROR_CODES.INTERNAL_ERROR;
}
