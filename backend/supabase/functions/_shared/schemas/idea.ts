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
