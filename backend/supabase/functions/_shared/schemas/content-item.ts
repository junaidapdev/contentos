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
