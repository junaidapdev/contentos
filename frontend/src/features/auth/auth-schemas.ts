import { z } from 'zod';

// UI-layer schemas (transient form inputs), so they live in the feature folder, not @shared/schemas
// (which is reserved for persistent domain entities). See /context/03-code-standards.md.
// Zod v4: `z.email()` is the non-deprecated top-level validator (the `.email()` string method is
// deprecated). We trim first, then validate the email format.
export const SignUpSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address.')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password is too long (max 72 characters).'),
});

export const SignInSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address.')),
  password: z.string().min(1, 'Password is required.'),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type SignInInput = z.infer<typeof SignInSchema>;
