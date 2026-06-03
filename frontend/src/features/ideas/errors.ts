import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';
import type { PgErrorPatternMap } from '@/lib/pg-error-mapping';

const KNOWN_CODES = new Set<string>(Object.values(ERROR_CODES));

// Error vocabulary for the spawn_sibling_content_items RPC (Chunk 05). The TOO_*_SPECS messages
// collapse to VALIDATION_FAILED for UI display; the underlying message is logged separately.
export const IDEA_PG_ERRORS: PgErrorPatternMap = [
  { pattern: 'NOT_AUTHENTICATED', code: ERROR_CODES.NOT_AUTHENTICATED },
  { pattern: 'NOT_FOUND', code: ERROR_CODES.NOT_FOUND },
  { pattern: 'TOO_FEW_SPECS', code: ERROR_CODES.VALIDATION_FAILED },
  { pattern: 'TOO_MANY_SPECS', code: ERROR_CODES.VALIDATION_FAILED },
];

// Normalize a thrown/rejected value (hooks throw new Error(code)) into a stable error code.
export function toIdeaErrorCode(value: unknown): ErrorCode {
  if (value instanceof Error && KNOWN_CODES.has(value.message)) {
    return value.message as ErrorCode;
  }
  return ERROR_CODES.INTERNAL_ERROR;
}
