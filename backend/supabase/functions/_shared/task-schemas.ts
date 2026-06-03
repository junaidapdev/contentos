// Task request/response schemas for the AI proxy. A discriminated union over `task` lets the
// proxy validate request shape exhaustively — an unknown task fails at the parse layer, not via
// an if/else. Each task owns its input + output schema.
//
// IMPORTANT: this file is imported by BOTH the Deno Edge Function AND the frontend
// (`@shared/task-schemas`), so it uses a BARE `zod` specifier (resolved by deno.json on the
// backend, by node_modules on the frontend) — NOT `npm:zod`. The relative import keeps its `.ts`
// extension (Deno convention; the frontend's tsconfig has allowImportingTsExtensions).
import { z } from 'zod';
import { SpawnSiblingSpecSchema } from './schemas/content-item.ts';

// --- suggest_sibling_specs -------------------------------------------------

export const SuggestSiblingSpecsInputSchema = z.object({
  // Brand-context pack markdown (Chunk 10 v1). Upper bound is the final safety net; the pack
  // builder already truncates at 100k, so 150k here is slack.
  pack_markdown: z.string().min(1).max(150_000),
  idea_title: z.string().min(1).max(300),
  idea_notes: z.string().max(5000).optional(),
  available_platform_slugs: z.array(z.string()).min(1).max(20),
  available_pillar_names: z.array(z.string()).min(0).max(50),
  desired_count: z.number().int().min(2).max(12),
});

// The model emits slugs/names (it doesn't know UUIDs); the frontend resolves them to ids. Built
// from SpawnSiblingSpecSchema minus the id fields, plus the slug/name fields.
export const SuggestedSpecSchema = SpawnSiblingSpecSchema.omit({
  platform_id: true,
  pillar_id: true,
}).extend({
  platform_slug: z.string().optional(),
  pillar_name: z.string().optional(),
});

export const SuggestSiblingSpecsOutputSchema = z.object({
  specs: z.array(SuggestedSpecSchema).min(1).max(12),
  rationale: z.string().min(1).max(2000).optional(),
});

// --- task dispatch union ---------------------------------------------------

export const AiTaskRequestSchema = z.discriminatedUnion('task', [
  z.object({
    task: z.literal('suggest_sibling_specs'),
    input: SuggestSiblingSpecsInputSchema,
  }),
  // Future tasks add a case here. Each new case is a new chunk.
]);

export type AiTaskRequest = z.infer<typeof AiTaskRequestSchema>;
export type SuggestSiblingSpecsInput = z.infer<typeof SuggestSiblingSpecsInputSchema>;
export type SuggestSiblingSpecsOutput = z.infer<typeof SuggestSiblingSpecsOutputSchema>;
export type SuggestedSpec = z.infer<typeof SuggestedSpecSchema>;
