# ContentEngine — Backend (Supabase)

Postgres schema, RLS policies, Edge Functions (Deno). Local stack runs via the Supabase CLI.

## Quickstart

```bash
supabase start          # boot the local stack (requires Docker)
supabase db reset       # apply all migrations + seed.sql
supabase status         # show local URLs and keys
supabase stop           # stop the stack
```

## Layout

```
backend/
├── supabase/
│   ├── config.toml
│   ├── migrations/         # ordered SQL migrations (timestamped)
│   ├── seed.sql            # demo data; runs on `db reset` (local only — never in production)
│   └── functions/
│       ├── deno.json       # Deno import map (maps bare `zod` -> npm:zod@4.4.3)
│       └── _shared/        # code shared across Edge Functions AND the frontend
│           ├── schemas/    # canonical Zod schemas — imported from the frontend via @shared
│           ├── constants/  # HTTP status, error codes (mirrors the frontend)
│           └── response.ts # envelope response helpers for Edge Functions
├── scripts/                # verify-rls.sh, seed-demo-data.sh (dev conveniences)
└── .env.example
```

## House rules

- Every user-owned table has RLS enabled with `auth.uid() = user_id`.
- Every multi-row write goes through a Postgres function or Edge Function (no client-side multi-statement writes).
- `updated_at` is maintained by triggers, not application code.
- New domain schemas are added to `supabase/functions/_shared/schemas/` and imported from the frontend via `@shared/schemas/*`.
- Shared schemas use a bare `zod` import: Deno resolves it via `functions/deno.json`, the frontend via its own `node_modules`. The Deno-only `npm:` specifier never leaks into the frontend.

See `/context/02-architecture.md` and `/context/03-code-standards.md` for the full rule set.
