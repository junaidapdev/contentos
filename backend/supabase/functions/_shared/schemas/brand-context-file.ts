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

// ---------------------------------------------------------------------------
// Section / display order (Chunk 10). The export pack groups files by kind in
// THIS order; the brand-context list page renders kind groups in this order too.
// It happens to equal BRAND_CONTEXT_KIND_VALUES today, but the separate name
// documents intent: this is a deliberate "identity first, task last" ordering
// (voice → audience → offers → platform_rules → do_dont → examples → other),
// not merely the enum's declaration order. Keep them in sync if the enum changes.
export const BRAND_CONTEXT_KIND_ORDER = [
  'voice',
  'audience',
  'offers',
  'platform_rules',
  'do_dont',
  'examples',
  'other',
] as const;

// ---------------------------------------------------------------------------
// Input shapes (Chunk 10). Body is required & non-empty (a brand-context file
// with no body is meaningless); 20,000-char cap mirrors the DB check constraint.
// ---------------------------------------------------------------------------
export const BrandContextFileCreateSchema = z.object({
  kind: BrandContextKindSchema,
  title: z.string().trim().min(1, 'Title is required.').max(200, 'Title is too long (max 200).'),
  body: z
    .string()
    .min(1, 'Body cannot be empty.')
    .max(20000, 'Body is too long (max 20,000 characters).'),
});

export type BrandContextFileCreateInput = z.infer<typeof BrandContextFileCreateSchema>;

export const BrandContextFileUpdateSchema = BrandContextFileCreateSchema.partial();
export type BrandContextFileUpdateInput = z.infer<typeof BrandContextFileUpdateSchema>;
