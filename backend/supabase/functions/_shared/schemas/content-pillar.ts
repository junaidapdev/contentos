import { z } from 'zod';

// Matches migration: content_pillars
//   name        text not null check (char_length between 1 and 100)
//   description text          check (char_length <= 500)  -- nullable
//   sort_order  int  not null default 0
export const ContentPillarSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  sort_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ContentPillar = z.infer<typeof ContentPillarSchema>;
