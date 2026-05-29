import { z } from 'zod';

// Matches migration: platforms (slug check list; display_name not null).
export const PLATFORM_SLUG_VALUES = [
  'youtube',
  'instagram',
  'linkedin',
  'x',
  'substack',
  'blog',
  'tiktok',
  'threads',
  'newsletter',
] as const;

export const PlatformSlugSchema = z.enum(PLATFORM_SLUG_VALUES);

export const PlatformSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  slug: PlatformSlugSchema,
  // display_name is `text not null` in the DB; the app caps it at 100 chars.
  display_name: z.string().min(1).max(100),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PlatformSlug = z.infer<typeof PlatformSlugSchema>;
export type Platform = z.infer<typeof PlatformSchema>;
