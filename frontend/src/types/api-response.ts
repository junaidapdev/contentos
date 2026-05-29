// Canonical envelope lives in @shared/schemas/api-response (backend/supabase/functions/_shared).
// This file re-exports it for frontend ergonomics and discoverability. Chunk 02 made the
// `@shared` alias resolve to real files; the schema is now authored in exactly one place.
export { ApiErrorSchema, ApiMetaSchema, ApiResponseSchema } from '@shared/schemas/api-response';

export type { ApiError, ApiMeta, ApiResponse } from '@shared/schemas/api-response';
