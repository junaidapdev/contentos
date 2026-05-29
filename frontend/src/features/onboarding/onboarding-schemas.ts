import { z } from 'zod';
import { PlatformSlugSchema } from '@shared/schemas/platform';

// UI-layer step schemas (transient onboarding inputs) — kept frontend-local, not in @shared/schemas
// (see /context/03-code-standards.md). Constraints mirror the DB check constraints from Chunk 02.

export const PlatformsStepSchema = z.object({
  slugs: z.array(PlatformSlugSchema).min(1, 'Select at least one platform.'),
});
export type PlatformsStepInput = z.infer<typeof PlatformsStepSchema>;

export const PillarsStepSchema = z.object({
  pillars: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, 'Pillar name is required.')
          .max(100, 'Keep pillar names under 100 characters.'),
      }),
    )
    .min(1, 'Add at least one pillar.')
    .max(8, 'You can add up to 8 pillars.'),
});
export type PillarsStepInput = z.infer<typeof PillarsStepSchema>;

export const CadenceStepSchema = z.object({
  targets: z.array(
    z.object({
      platformId: z.uuid(),
      weeklyTarget: z
        .number()
        .int('Use a whole number.')
        .min(0, 'Cannot be negative.')
        .max(200, 'Keep it at or below 200 per week.'),
    }),
  ),
});
export type CadenceStepInput = z.infer<typeof CadenceStepSchema>;
