// Mirrors frontend/src/constants/http-status.ts. The Node and Deno runtimes do not share
// modules, so both keep a local copy of this constant. Keep the two in sync.
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
});

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
