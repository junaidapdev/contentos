import { z } from 'zod';

// Matches migration: ideas
//   title    text not null check (char_length between 1 and 300)
//   notes    text          check (char_length <= 5000)  -- nullable
//   pillar_id uuid references content_pillars on delete set null  -- nullable
export const IdeaSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  notes: z.string().max(5000).nullable(),
  pillar_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Idea = z.infer<typeof IdeaSchema>;

// Input shapes (Chunk 05). Empty-string notes from the form are normalized to undefined so the DB
// stores null, never ''.
export const IdeaCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(300, 'Title is too long (max 300).'),
  notes: z
    .string()
    .trim()
    .max(5000, 'Notes are too long (max 5000).')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  pillar_id: z.uuid().optional(),
});

export type IdeaCreateInput = z.infer<typeof IdeaCreateSchema>;

// Partial form of the create schema. All fields optional for incremental edits.
export const IdeaUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required.')
    .max(300, 'Title is too long (max 300).')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(5000, 'Notes are too long (max 5000).')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  pillar_id: z.uuid().nullable().optional(),
});

export type IdeaUpdateInput = z.infer<typeof IdeaUpdateSchema>;
