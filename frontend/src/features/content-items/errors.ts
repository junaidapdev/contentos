import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';
import type { PgErrorPatternMap } from '@/lib/pg-error-mapping';

const KNOWN_CODES = new Set<string>(Object.values(ERROR_CODES));

// Error vocabulary for content-item RPCs. update_content_item_status (Chunk 04) raises the first
// four; spawn_cross_post_variants (Chunk 06) raises the rest. Order matters — the first matching
// token wins (NOT_AUTHENTICATED before NOT_FOUND so a future "NOT_AUTHENTICATED_NOT_FOUND" doesn't
// accidentally match the second). Hooks call mapPgError(message, CONTENT_ITEM_PG_ERRORS) directly.
export const CONTENT_ITEM_PG_ERRORS: PgErrorPatternMap = [
  { pattern: 'NOT_AUTHENTICATED', code: ERROR_CODES.NOT_AUTHENTICATED },
  { pattern: 'INVALID_TRANSITION', code: ERROR_CODES.INVALID_TRANSITION },
  { pattern: 'SCHEDULED_REQUIRES_DATE', code: ERROR_CODES.SCHEDULED_REQUIRES_DATE },
  { pattern: 'PUBLISHED_REQUIRES_DATE', code: ERROR_CODES.PUBLISHED_REQUIRES_DATE },
  { pattern: 'SOURCE_LACKS_PLATFORM', code: ERROR_CODES.VALIDATION_FAILED },
  { pattern: 'NO_TARGET_PLATFORMS', code: ERROR_CODES.VALIDATION_FAILED },
  { pattern: 'TOO_MANY_PLATFORMS', code: ERROR_CODES.VALIDATION_FAILED },
  { pattern: 'TARGET_INCLUDES_SOURCE_PLATFORM', code: ERROR_CODES.CONFLICT },
  { pattern: 'PLATFORM_ALREADY_COVERED', code: ERROR_CODES.CONFLICT },
  { pattern: 'INVALID_PLATFORM', code: ERROR_CODES.VALIDATION_FAILED },
  { pattern: 'NOT_FOUND', code: ERROR_CODES.NOT_FOUND },
];

// Normalize a thrown/rejected value (hooks throw new Error(code)) into a stable error code.
export function toContentItemErrorCode(value: unknown): ErrorCode {
  if (value instanceof Error && KNOWN_CODES.has(value.message)) {
    return value.message as ErrorCode;
  }
  return ERROR_CODES.INTERNAL_ERROR;
}
