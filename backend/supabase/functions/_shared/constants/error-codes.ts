// Mirrors frontend/src/constants/error-codes.ts. The Node and Deno runtimes do not share
// modules, so both keep a local copy of this constant. Keep the two in sync.
// Stable error codes thrown by mutations/queries and returned by Edge Functions.
export const ERROR_CODES = Object.freeze({
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  // Content-item lifecycle (Chunk 04). Distinct codes so each maps to its own message.
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  SCHEDULED_REQUIRES_DATE: 'SCHEDULED_REQUIRES_DATE',
  PUBLISHED_REQUIRES_DATE: 'PUBLISHED_REQUIRES_DATE',
  // AI proxy (Chunk 11). MUST mirror frontend/src/constants/error-codes.ts exactly.
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_UPSTREAM_ERROR: 'AI_UPSTREAM_ERROR',
  AI_RESPONSE_INVALID: 'AI_RESPONSE_INVALID',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
});

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
