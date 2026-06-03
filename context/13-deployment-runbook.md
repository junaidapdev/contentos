# Deployment Runbook (Chunk 13)

Operational guide for deploying ContentEngine to production and rolling back when
something goes wrong. The chunk-13 spec locked in the architecture; this file is
the day-to-day reference the operator uses.

The two halves of the application deploy **independently**: the frontend to Vercel,
the backend (migrations + Edge Functions) to Supabase via the CLI. Either side can
roll back without the other. Ordering matters when a frontend change depends on a
backend change — push backend first; promote frontend after. The reverse (backend
change requires the new frontend) is rarer but still requires this discipline.

---

## Frontend (Vercel) — one-time setup

1. **Create the Vercel project** from the Vercel dashboard → "Add New…" → Project,
   selecting the GitHub repo. (If the repo is on GitLab or Bitbucket, the dashboard
   prompts adjust slightly — same outcome.)
2. **Configure the project** (Project Settings):
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (auto-detected from `frontend/vercel.json`)
   - **Build / Output / Install commands:** inherited from `vercel.json`; do NOT
     override in the UI unless you have a specific reason — config-as-code is the
     rule (chunk-13 decisions).
3. **Add environment variables** (Project Settings → Environment Variables). Apply
   each to all three scopes: Production, Preview, Development.
   - `VITE_APP_NAME` = `ContentEngine`
   - `VITE_APP_ENV` = `production` (Vercel's UI also lets you override per scope —
     `preview` for the Preview scope, `development` for Development if needed)
   - `VITE_SUPABASE_URL` = the URL of the hosted Supabase project (see backend
     setup below)
   - `VITE_SUPABASE_ANON_KEY` = the publishable / anon key from the same project
4. **Connect the production branch:** `main`. Vercel auto-creates a Preview
   environment for every other branch and every PR.
5. **Push to `main`** → first production deploy fires. The deploy URL appears in
   the Vercel dashboard and as a comment on the PR (if PR-triggered).

### Frontend deploys per release

1. Open a PR → wait for the Vercel preview URL → smoke-test the preview (see
   below).
2. Merge to `main` → Vercel deploys automatically.
3. Verify on the production URL (e.g.
   `https://contentengine-prod.vercel.app`).
4. Run `bash scripts/smoke-test.sh <frontend-url> <supabase-url> <anon-key>`.

---

## Backend (Supabase) — one-time setup

1. **Create the hosted Supabase project** from the Supabase dashboard. Note the
   project ref (the URL component, e.g. `fgtkbmxjplgabhtpumzj`) — required for
   linking.
2. **Authenticate and link** from a dev machine:
   ```bash
   supabase login                     # one-time
   cd backend
   supabase link --project-ref <project-ref>
   ```
   The `link` step pulls down the project's config and lets subsequent CLI
   commands operate against it.
3. **Push the initial schema:**
   ```bash
   supabase db push
   ```
   Forward-only migrations — see the rollback section for what to do if a
   migration ships broken.
4. **Set Edge Function secrets:**
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
   auto-set by Supabase as built-in secrets for Edge Functions — verify with
   `supabase secrets list`. The service role key NEVER appears in any committed
   file and is never set manually here.

   **Provision the production `ANTHROPIC_API_KEY` separately from your dev key**
   (Anthropic console → API keys → "Create key"). Separate keys give separate
   billing and separate rate-limit accounting. Confirm dev and prod keys are
   distinct.
5. **Deploy the Edge Function:**
   ```bash
   supabase functions deploy anthropic-proxy
   ```

### Backend deploys per release

Use the wrapper script:

```bash
bash backend/scripts/deploy.sh
```

The script:
1. Echoes the linked project so you can confirm you're hitting the right one.
2. Asks `y/N` before `supabase db push`.
3. Asks `y/N` before `supabase functions deploy anthropic-proxy`.

The ordering — migrations first, function second — is enforced by the script's
sequencing. The Edge Function depends on the `ai_request_log` table (Chunk 11);
deploying the function against a missing table 500s on every request.

---

## Smoke test (after every deploy)

```bash
bash scripts/smoke-test.sh \
  https://contentengine-prod.vercel.app \
  https://<project-ref>.supabase.co \
  <anon-key>
```

The script runs 5 checks (see `scripts/README.md` for the full list) and exits
non-zero on any failure. None of the checks mutate data, send PII, or require any
state in the database — safe to run against a fresh project or production at any
time.

A typical green run looks like:

```
=== ContentEngine Smoke Test ===
[1/5] Frontend index...
  ✓ Frontend returns 200
[2/5] SPA fallback for /dashboard...
  ✓ SPA fallback for deep links
[3/5] Supabase REST reachable...
  ✓ Supabase REST reachable
[4/5] Edge Function requires auth...
  ✓ Edge Function rejects unauthenticated requests
[5/5] Anon key has expected access...
  ✓ Anon key can hit REST root

=== Results: 5 passed, 0 failed ===
```

---

## Rollback

### Frontend rollback (Vercel)

1. Open the Vercel project dashboard → **Deployments** tab.
2. Find the last known-good deployment (rows are sorted newest-first; the
   timestamp + commit SHA disambiguate).
3. Click the `…` menu on that row → **"Promote to Production"**. Vercel routes
   the production URL to that build immediately; no rebuild required.
4. Verify by hitting the production URL and confirming the old build serves.

If the rollback target depends on env vars that have changed since (e.g., a new
`VITE_*` was added in the meantime), the older bundle may fail at startup
because the Zod env validator runs at app boot. Symptom: blank page + console
error from `env.ts`. Fix: temporarily restore the old env-var set in Vercel, or
forward-fix by deploying a patch.

### Backend rollback — Edge Function

Edge Functions are versioned by deploy; rolling back means deploying an earlier
commit's code:

```bash
cd backend
git checkout <previous-commit-with-good-function>
supabase functions deploy anthropic-proxy
git checkout main
```

Verify by hitting the function endpoint and confirming the older behavior. The
deploy is hot — old in-flight requests complete on the previous build; new
requests hit the rolled-back build.

### Backend rollback — migrations

**Migrations are forward-only.** There is no "down" migration. If a bad
migration ships:

1. **Author a NEW migration that fixes the problem.** A dropped column is added
   back; a bad constraint is replaced; etc. Some operations are not recoverable
   this way — a dropped table can't be unbroken without data restore.
2. **Apply via `supabase db push`** (which runs through `deploy.sh`).
3. **For data loss situations,** use Supabase's point-in-time recovery (Project →
   Database → Backups). Note the affected time range and user(s). PITR is a heavy
   tool; reserve for true data loss.

**Lesson:** test every migration locally with `supabase db reset` (which applies
ALL migrations from scratch against a fresh local DB) before pushing. If
`db reset` fails, `db push` will too — and in production a `db push` failure
mid-migration can leave the DB in a partial state.

---

## Environment matrix

| Env             | Frontend                         | Backend                    | Anthropic key         |
|-----------------|----------------------------------|----------------------------|-----------------------|
| Local dev       | `npm run dev` (localhost:5173)   | `supabase start`           | from `backend/.env`   |
| PR preview      | Vercel preview URL               | **Production** Supabase    | **Production** key    |
| Production      | Vercel production URL            | Production Supabase        | Production key        |

PR previews and production share the same backend. There is **no separate staging
Supabase** by design (chunk-13 decisions): solo creator product, cost of a staging
tier exceeds its value at MVP scale. Trade-off: a PR preview that exercises a
mutation writes to the production DB. Mitigation: PR authors must use throwaway
emails when exercising flows on a preview, and audit the production DB if a PR
creates persistent test data. If usage grows or contributors arrive, introduce
a `staging` branch + a staging Supabase project.

---

## Secrets management

The rule: **if you add a new env variable, you add it to the relevant
`.env.example` in the same PR. No real secrets in `.env.example` — only the
variable name with an empty value or a placeholder comment.**

Where each secret lives:

| Secret                          | Where it lives                                   | Visible to                |
|---------------------------------|--------------------------------------------------|---------------------------|
| `VITE_SUPABASE_URL`             | Vercel env vars (all 3 scopes)                   | Frontend bundle (public)  |
| `VITE_SUPABASE_ANON_KEY`        | Vercel env vars (all 3 scopes)                   | Frontend bundle (public)  |
| `VITE_APP_NAME` / `VITE_APP_ENV`| Vercel env vars (all 3 scopes)                   | Frontend bundle (public)  |
| `ANTHROPIC_API_KEY`             | `supabase secrets set …` on the hosted project   | Edge Function runtime     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Auto-set by Supabase as a built-in secret        | Edge Function runtime     |

The `VITE_*` vars are not secret per Supabase's RLS model — RLS protects data,
not key secrecy. But still treat the anon key as restricted: don't paste it into
chat logs, don't bake it into the repo. Vercel's env-var store is the only
sanctioned home.

---

## Custom domain (deferred)

Launch happens on the default Vercel URL (`*.vercel.app`). Custom domain
configuration is a 5-minute task once a domain is purchased (Vercel → Domains →
Add → follow DNS prompts). Not gating the launch.

---

## Quick reference

| Task                              | Command                                                  |
|-----------------------------------|----------------------------------------------------------|
| Deploy backend                    | `bash backend/scripts/deploy.sh`                         |
| Smoke-test production             | `bash scripts/smoke-test.sh <frontend> <supabase> <key>` |
| Roll back frontend                | Vercel → Deployments → previous build → Promote          |
| Roll back Edge Function           | `git checkout <sha> && supabase functions deploy anthropic-proxy && git checkout main` |
| Audit secrets                     | `git log --all -p \| grep -E "(sk-ant\|ey[A-Za-z0-9]{30,})"` (expect 0 hits) |
| Inspect production secrets        | `supabase secrets list` (names only; values redacted)    |
| Test migration locally first      | `supabase db reset` (applies all migrations from scratch)|
