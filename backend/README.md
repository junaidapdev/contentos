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
│       ├── _shared/        # code shared across Edge Functions AND the frontend
│       │   ├── schemas/    # canonical Zod schemas — imported from the frontend via @shared
│       │   ├── constants/  # HTTP status, error codes (mirrors the frontend)
│       │   ├── response.ts # envelope response helpers for Edge Functions
│       │   ├── logger.ts          # Deno-side logger (the only console.* caller in backend)
│       │   ├── anthropic-config.ts / anthropic-client.ts  # Anthropic integration (Chunk 11)
│       │   ├── rate-limit.ts       # per-user rate-limit lookups (Chunk 11)
│       │   ├── task-schemas.ts     # discriminated-union AI task schemas (shared w/ frontend)
│       │   └── task-handlers.ts    # AI task dispatch + prompt construction (Chunk 11)
│       └── anthropic-proxy/  # Edge Function: hardened Anthropic proxy (Chunk 11)
├── scripts/                # verify-rls.sh, seed-demo-data.sh (dev conveniences)
└── .env.example
```

## Edge Functions

### `anthropic-proxy` (Chunk 11)

The first secret-holding backend. Proxies the Anthropic Messages API with the server-held
`ANTHROPIC_API_KEY`; the browser never sees the key. Authenticates the caller via JWT, enforces
per-user rate limits (20/min, 200/day) via `ai_request_log`, validates request shape with a
discriminated-union Zod schema, validates the model's output before returning, and wraps everything
in the canonical envelope. Errors are mapped to stable codes — Anthropic's raw errors never reach
the client.

Run locally:

```bash
cp .env.example .env       # fill SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY (from `supabase status`) + ANTHROPIC_API_KEY (from the Anthropic console)
supabase functions serve anthropic-proxy --env-file .env
```

Env vars (see `.env.example` for where each comes from): `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. The service role key is used ONLY for
`ai_request_log` inserts and rate-limit reads. Before the hosted deploy (Chunk 13), set
`ANTHROPIC_API_KEY` (and confirm the auto-injected Supabase vars) in the project secrets.

The pinned model lives in `_shared/anthropic-config.ts` (`ANTHROPIC_MODEL`) — the single source of
truth. Verify the exact identifier against current Anthropic docs before deploying.

## House rules

- Every user-owned table has RLS enabled with `auth.uid() = user_id`.
- Every multi-row write goes through a Postgres function or Edge Function (no client-side multi-statement writes).
- `updated_at` is maintained by triggers, not application code.
- New domain schemas are added to `supabase/functions/_shared/schemas/` and imported from the frontend via `@shared/schemas/*`.
- Shared schemas use a bare `zod` import: Deno resolves it via `functions/deno.json`, the frontend via its own `node_modules`. The Deno-only `npm:` specifier never leaks into the frontend.

See `/context/02-architecture.md` and `/context/03-code-standards.md` for the full rule set.

## Deployment

The backend deploys via the Supabase CLI from a dev machine. **Manual on purpose** — schema migrations are dangerous, and an automated `git push → db push` to production is too easy to misfire. See `/context/13-deployment-runbook.md` for the full operational guide (setup, per-release flow, rollback).

**Production Supabase project:** recorded in `.env.example` as `SUPABASE_PROJECT_ID` after the one-time `supabase link` step.

**Secrets** (set via `supabase secrets set` on the hosted project):

- `ANTHROPIC_API_KEY` — the production Anthropic API key. **Provision separately from dev** for billing isolation (Anthropic console → API keys → "Create key").
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — auto-set by Supabase as built-in secrets for Edge Functions. Verify via `supabase secrets list` (names only; values redacted). The service role key never appears in any committed file.

Local development uses the local Supabase stack started by `supabase start`. Credentials come from `supabase status` and are placed in `backend/.env`.

**To deploy:**

```bash
bash backend/scripts/deploy.sh
```

The script confirms before each step (`y/N`) and runs migrations first, then deploys the Edge Function — order matters because `anthropic-proxy` reads from the `ai_request_log` table.

**Post-deploy:** run the smoke test from the repo root:

```bash
bash scripts/smoke-test.sh <frontend-url> <supabase-url> <anon-key>
```
