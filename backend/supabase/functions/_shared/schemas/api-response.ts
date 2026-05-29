// Canonical API response envelope — shared between Edge Functions (Deno) and the frontend (Vite).
// The frontend imports this exact file via the `@shared/schemas/api-response` alias and re-exports it.
//
// Cross-runtime note: the import below is a BARE `zod` specifier, NOT `npm:zod`. Deno resolves it via
// the import map in `backend/supabase/functions/deno.json` ("zod" -> "npm:zod@4.4.3"); the frontend
// resolves it via its own node_modules (zod 4.4.3). Both runtimes use the same Zod version, and the
// Deno-only `npm:` specifier never leaks into the frontend's module resolution.
//
// Zod v4: `z.record` takes an explicit key schema, and the generic constraint uses `z.ZodType`
// (the deprecated `z.ZodTypeAny` is avoided).
import { z } from 'zod';

export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const ApiMetaSchema = z.object({
  request_id: z.string().optional(),
  page: z.number().int().nonnegative().optional(),
  page_size: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
  next_cursor: z.string().nullable().optional(),
});

export function ApiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.discriminatedUnion('success', [
    z.object({ success: z.literal(true), data: dataSchema, meta: ApiMetaSchema.optional() }),
    z.object({ success: z.literal(false), error: ApiErrorSchema, meta: ApiMetaSchema.optional() }),
  ]);
}

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiMeta = z.infer<typeof ApiMetaSchema>;
export type ApiResponse<T> =
  | { success: true; data: T; meta?: ApiMeta }
  | { success: false; error: ApiError; meta?: ApiMeta };
