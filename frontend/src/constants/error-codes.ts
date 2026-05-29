// Stable error codes thrown by mutations/queries and returned by Edge Functions.
// The UI maps these to user-facing strings via feature-local messages.ts files.
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
});

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
