import { z } from 'zod';

// Matches migration: cadence_targets
//   weekly_target int not null check (weekly_target >= 0 and weekly_target <= 200)
export const CadenceTargetSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  platform_id: z.string().uuid(),
  weekly_target: z.number().int().min(0).max(200),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CadenceTarget = z.infer<typeof CadenceTargetSchema>;
