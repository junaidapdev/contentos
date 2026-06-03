# Scripts

Repo-level operational scripts. See `/context/13-deployment-runbook.md` for the
full deployment procedure these scripts support.

## `smoke-test.sh`

Runs after every deploy to verify health of the deployed environment. Five
HTTP checks, no mutations, no PII.

```bash
bash scripts/smoke-test.sh <frontend-url> <supabase-url> <anon-key>
```

Returns exit `0` on all-pass, `1` on any failure. The checks:

1. Frontend index returns 200.
2. Frontend SPA fallback returns 200 on a deep link (`/dashboard`) — verifies
   `vercel.json`'s rewrite is wired.
3. Supabase REST host is reachable with the anon key.
4. Edge Function (`anthropic-proxy`) rejects unauthenticated requests with 401
   — verifies the function is deployed AND `verify_jwt = true` is in effect.
5. Anon key can hit the PostgREST root and gets a non-empty response.

## Backend scripts (`/backend/scripts/`)

Documented here for discoverability; the files live under `backend/`:

- **`deploy.sh`** (Chunk 13) — production deploy of migrations + Edge Function.
  Confirms before each step. Ordering: migrations first, function second.
- **`verify-rls.sh`** (Chunk 02) — local RLS verification. Hits the local
  Supabase via `supabase status`.
- **`seed-demo-data.sh`** (Chunk 02) — local seeding for dev convenience.
  Never run against production.
