import { z } from 'zod';

// Matches migration: content_items
//   format check list (9 values); status check list (5 values)
//   title 1..300; published_url <= 500 (nullable); notes <= 5000 (nullable)
//   idea_id / platform_id / pillar_id nullable (on delete set null)
//   scheduled_for / published_at timestamptz nullable
// The two DB-level transition guards (status='scheduled' requires scheduled_for;
// status='published' requires published_at) are enforced by the database, which is the
// source of truth for those cross-field invariants. Create/update input schemas in later
// chunks can add a `.refine()` if form-time validation is wanted.
export const CONTENT_ITEM_FORMAT_VALUES = [
  'post',
  'thread',
  'reel',
  'short',
  'video',
  'newsletter',
  'blog_post',
  'story',
  'other',
] as const;

export const CONTENT_ITEM_STATUS_VALUES = [
  'idea',
  'drafting',
  'ready',
  'scheduled',
  'published',
] as const;

export const ContentItemFormatSchema = z.enum(CONTENT_ITEM_FORMAT_VALUES);
export const ContentItemStatusSchema = z.enum(CONTENT_ITEM_STATUS_VALUES);

export const ContentItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  idea_id: z.string().uuid().nullable(),
  platform_id: z.string().uuid().nullable(),
  pillar_id: z.string().uuid().nullable(),
  title: z.string().min(1).max(300),
  format: ContentItemFormatSchema,
  status: ContentItemStatusSchema,
  scheduled_for: z.string().nullable(),
  published_at: z.string().nullable(),
  published_url: z.string().max(500).nullable(),
  notes: z.string().max(5000).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ContentItemFormat = z.infer<typeof ContentItemFormatSchema>;
export type ContentItemStatus = z.infer<typeof ContentItemStatusSchema>;
export type ContentItem = z.infer<typeof ContentItemSchema>;

// ---------------------------------------------------------------------------
// Lifecycle state machine (added in Chunk 04). This transition table is the
// SOURCE OF TRUTH; the Postgres function `public.update_content_item_status`
// mirrors it inline, and the DB check constraints describe the value set.
// Keep all three in sync — see /context/03-code-standards.md, "State machines".
//   idea       -> drafting, ready
//   drafting   -> idea, ready
//   ready      -> drafting, scheduled, published
//   scheduled  -> ready, published
//   published  -> (terminal; only non-status edits)
// ---------------------------------------------------------------------------
export const CONTENT_ITEM_STATUS_TRANSITIONS: Record<
  ContentItemStatus,
  ReadonlyArray<ContentItemStatus>
> = {
  idea: ['drafting', 'ready'],
  drafting: ['idea', 'ready'],
  ready: ['drafting', 'scheduled', 'published'],
  scheduled: ['ready', 'published'],
  published: [],
};

export function isAllowedStatusTransition(
  from: ContentItemStatus,
  to: ContentItemStatus,
): boolean {
  if (from === to) return true;
  return CONTENT_ITEM_STATUS_TRANSITIONS[from].includes(to);
}

// Input shapes (Chunk 04). Zod v4 non-deprecated validators: z.uuid / z.url / z.iso.datetime.
// Date fields carry ISO strings (the frontend converts datetime-local <-> ISO at the input).
// Empty strings from form inputs are normalized to nullish so the DB stores null, never ''.

export const ContentItemCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(300, 'Title is too long (max 300).'),
  format: ContentItemFormatSchema,
  platform_id: z.uuid().optional(),
  pillar_id: z.uuid().optional(),
  idea_id: z.uuid().optional(),
  notes: z
    .string()
    .trim()
    .max(5000, 'Notes are too long (max 5000).')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  scheduled_for: z.iso.datetime().optional(),
});

export type ContentItemCreateInput = z.infer<typeof ContentItemCreateSchema>;

export const ContentItemUpdateSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(300, 'Title is too long (max 300).').optional(),
    format: ContentItemFormatSchema.optional(),
    platform_id: z.uuid().nullable().optional(),
    pillar_id: z.uuid().nullable().optional(),
    status: ContentItemStatusSchema.optional(),
    scheduled_for: z.iso.datetime().nullable().optional(),
    published_at: z.iso.datetime().nullable().optional(),
    published_url: z
      .url('Enter a valid URL.')
      .max(500, 'URL is too long (max 500).')
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
    notes: z
      .string()
      .trim()
      .max(5000, 'Notes are too long (max 5000).')
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
  })
  // Mirrors the DB check constraints (the migration is the source of truth): scheduled needs a
  // scheduled_for; published needs a published_at.
  .refine(
    (data) => {
      if (data.status === 'scheduled' && data.scheduled_for === null) return false;
      if (data.status === 'published' && data.published_at === null) return false;
      return true;
    },
    {
      message:
        'Scheduled status requires a scheduled date; published status requires a published date.',
    },
  );

export type ContentItemUpdateInput = z.infer<typeof ContentItemUpdateSchema>;

// ---------------------------------------------------------------------------
// Sibling spawning (Chunk 05). One idea -> N native-format content items in one
// atomic call. Validated client-side here AND server-side in the
// spawn_sibling_content_items RPC. The 2..12 array bound is enforced in both
// places. Title defaults to the idea's title server-side if omitted per-spec.
// ---------------------------------------------------------------------------
export const SpawnSiblingSpecSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(300, 'Title is too long (max 300).')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  format: ContentItemFormatSchema,
  platform_id: z.uuid().optional(),
  pillar_id: z.uuid().optional(),
});

export const SpawnSiblingsSchema = z.object({
  idea_id: z.uuid(),
  specs: z
    .array(SpawnSiblingSpecSchema)
    .min(2, 'Spawn at least two items, or create a standalone item instead.')
    .max(12, 'You can spawn at most 12 items at once.'),
});

export type SpawnSiblingSpec = z.infer<typeof SpawnSiblingSpecSchema>;
export type SpawnSiblingsInput = z.infer<typeof SpawnSiblingsSchema>;

// ---------------------------------------------------------------------------
// Cross-post spawning (Chunk 06). One source item -> N platform-specific child
// items in one atomic call. Children inherit title/format/idea_id/pillar_id/notes
// from the source (copied at spawn time, NOT linked — independent editing is the
// intended workflow). status starts at 'idea' on every child. The 1..20 array
// bound is enforced both here (form-time) and server-side in the
// spawn_cross_post_variants RPC.
// ---------------------------------------------------------------------------
export const CrossPostSpawnSchema = z.object({
  source_item_id: z.uuid(),
  target_platform_ids: z
    .array(z.uuid())
    .min(1, 'Pick at least one platform to cross-post to.')
    .max(20, 'Too many platforms in a single cross-post.'),
});

export type CrossPostSpawnInput = z.infer<typeof CrossPostSpawnSchema>;

// ---------------------------------------------------------------------------
// Repurposing spawning (Chunk 07). One long-form parent -> N derivative children
// in one atomic call. Children inherit title/idea_id/pillar_id from the parent
// (copied at spawn time, NOT linked); status starts at 'idea' on every child.
// Format MUST be explicit per spec — the entire point of repurposing is producing
// different formats. The 1..12 array bound is enforced both client-side and
// server-side in spawn_repurposed_children. min=1 (not 2 like siblings) because
// repurposing one long-form into one short-form is a valid workflow.
// ---------------------------------------------------------------------------
export const RepurposeSpecSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(300, 'Title is too long (max 300).')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  format: ContentItemFormatSchema,
  platform_id: z.uuid().optional(),
  pillar_id: z.uuid().optional(),
});

export const RepurposeSpawnSchema = z.object({
  parent_item_id: z.uuid(),
  specs: z
    .array(RepurposeSpecSchema)
    .min(1, 'Add at least one repurposed item.')
    .max(12, 'You can repurpose into at most 12 items at once.'),
});

export type RepurposeSpec = z.infer<typeof RepurposeSpecSchema>;
export type RepurposeSpawnInput = z.infer<typeof RepurposeSpawnSchema>;

// ---------------------------------------------------------------------------
// Content-items list row. Backed by public.content_items_list_view — a
// security_invoker = true view that augments the base table with five aggregate
// columns covering all three relationship types. RLS evaluates as the caller, so
// per-row aggregates are scoped to the user's own relationships.
//
// Chunk 06 shipped this with cross_post_group_size only (via
// content_items_with_cross_post_size). Chunk 07 dropped that view and replaced
// it with content_items_list_view carrying the full set.
// ---------------------------------------------------------------------------
export const ContentItemListRowSchema = ContentItemSchema.extend({
  cross_post_group_size: z.number().int().nonnegative(),
  sibling_group_size: z.number().int().nonnegative(),
  repurposed_children_count: z.number().int().nonnegative(),
  repurposed_from_parent_id: z.uuid().nullable(),
  repurposed_from_parent_title: z.string().min(1).max(300).nullable(),
});

export type ContentItemListRow = z.infer<typeof ContentItemListRowSchema>;
