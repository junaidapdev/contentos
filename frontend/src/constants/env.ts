import { z } from 'zod';

const EnvSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default('ContentEngine'),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_SUPABASE_URL: z.url('VITE_SUPABASE_URL must be a valid URL.'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required.'),
});

const parsed = EnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // This runs at module load, before any UI renders. Fail loudly.
  // We use console.error here intentionally — the logger isn't ready and the app cannot start.
  // (z.flattenError is the Zod v4 replacement for the deprecated ZodError.flatten() instance method.)
  // eslint-disable-next-line no-console
  console.error('[env] Invalid or missing environment variables:', z.flattenError(parsed.error));
  throw new Error('Invalid environment configuration. See console for details.');
}

export const ENV = Object.freeze({
  APP_NAME: parsed.data.VITE_APP_NAME,
  APP_ENV: parsed.data.VITE_APP_ENV,
  IS_PRODUCTION: parsed.data.VITE_APP_ENV === 'production',
  SUPABASE_URL: parsed.data.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: parsed.data.VITE_SUPABASE_ANON_KEY,
});

export type AppEnv = (typeof ENV)['APP_ENV'];
