import { z } from 'zod';

// Matches migration: brand_context_files
//   kind check list (7 values); title 1..200; body not null check (<= 20000)
export const BRAND_CONTEXT_KIND_VALUES = [
  'voice',
  'audience',
  'offers',
  'platform_rules',
  'do_dont',
  'examples',
  'other',
] as const;

export const BrandContextKindSchema = z.enum(BRAND_CONTEXT_KIND_VALUES);

export const BrandContextFileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  kind: BrandContextKindSchema,
  title: z.string().min(1).max(200),
  body: z.string().max(20000),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BrandContextKind = z.infer<typeof BrandContextKindSchema>;
export type BrandContextFile = z.infer<typeof BrandContextFileSchema>;
