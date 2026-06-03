import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';

/**
 * Ordered list of (pattern, ErrorCode) pairs used by feature-level RPC hooks to translate
 * Postgres error messages (typically the verbatim text from a plpgsql `raise exception`) into
 * stable ErrorCode values the UI can resolve to copy. Patterns are matched via simple substring
 * inclusion in declaration order — the first match wins.
 *
 * Extracted in Chunk 06 and re-shaped in Chunk 07 to the object form spelled out in the chunk-07
 * spec. The object shape reads more clearly at use sites than the original tuple form:
 *
 *   { pattern: 'NOT_FOUND', code: ERROR_CODES.NOT_FOUND }
 *
 * Four RPC mutations now share this lib:
 *   * useUpdateContentItemStatus   (Chunk 04)
 *   * useSpawnSiblings             (Chunk 05)
 *   * useSpawnCrossPostVariants    (Chunk 06)
 *   * useSpawnRepurposedChildren   (Chunk 07)
 *
 * The lib does NOT log; logging happens at the call site so the payload shape stays controlled.
 */
export type PgErrorPatternMap = ReadonlyArray<{ pattern: string; code: ErrorCode }>;

/**
 * Maps a Postgres error message to one of our stable ErrorCode values via substring inclusion.
 * If no pattern matches, returns INTERNAL_ERROR — a safe default that surfaces the generic
 * "something went wrong" copy at the UI.
 *
 * Usage:
 *   const code = mapPgError(error.message, [
 *     { pattern: 'NOT_FOUND', code: ERROR_CODES.NOT_FOUND },
 *     { pattern: 'TOO_MANY_SPECS', code: ERROR_CODES.VALIDATION_FAILED },
 *   ]);
 */
export function mapPgError(message: string, patterns: PgErrorPatternMap): ErrorCode {
  for (const { pattern, code } of patterns) {
    if (message.includes(pattern)) return code;
  }
  return ERROR_CODES.INTERNAL_ERROR;
}
