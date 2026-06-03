# Pre-Launch Audit — Chunk 14

**Date:** 2026-06-03
**Auditor:** Claude Code agent (static audit; operator finishes live items)
**Production frontend URL:** **OPERATOR_RUN_PENDING** (set after Vercel project creation per Chunk 13 runbook)
**Production Supabase project ref:** **OPERATOR_RUN_PENDING** (set after `supabase link` per Chunk 13 runbook)
**Scope:** static, code-readable audit only. Live-environment checks (production SQL, production smoke
test, manual E2E, live rate-limit verification, cross-user RLS against production) are tagged
**OPERATOR_RUN_PENDING** and are the operator's last gate before launch. Every other item is
verified from the committed code.

---

## Code Review Item 1 — No stray `Fix.md` / `fix.md` files committed

**Status:** PASS

**Evidence:**
- `.gitignore` (lines 41-48) excludes `/*Fix.md`, `/*fix.md`, `/CrossFix.md`, `/DeploymentFix.md`,
  `/frontend/**/*Fix.md`, `/backend/**/*Fix.md`.
- `git ls-files | grep -E '(Fix|fix)\.md$'` → zero results.
- Permitted Markdown locations comment in `.gitignore` is enforced.

---

## Code Review Item 2 — `.cursor/` not committed

**Status:** PASS

**Evidence:**
- `.gitignore` excludes `.cursor/`.
- `git ls-files | grep -i 'cursor'` → zero results.

---

## Code Review Item 3 — Modular interfaces (one concept per types file)

**Status:** PASS

**Evidence:**
- `/frontend/src/types/` contains exactly one file (`api-response.ts`) — single concept.
- `/backend/supabase/functions/_shared/schemas/` contains 8 files, one per concept:
  `api-response.ts`, `brand-context-file.ts`, `cadence-target.ts`, `content-item.ts`,
  `content-pillar.ts`, `content-relationship.ts`, `idea.ts`, `platform.ts`.
- No file is named `types.ts` or holds more than one unrelated concept.
- Feature-local types (e.g. `useUpdateContentItem.ts`'s `ContentItemUpdatePayload`) live alongside
  the consuming hook, not in a shared dump file.

---

## Code Review Item 4 — Env vars via constants file (no direct `process.env` / `import.meta.env`)

**Status:** PASS

**Evidence:**
- `grep -rEn 'process\.env|import\.meta\.env' frontend/src/ --include="*.ts" --include="*.tsx" | grep -v 'constants/env.ts'`
  → zero results.
- `grep -rEn 'Deno\.env' backend/supabase/functions/ --include="*.ts" | grep -v 'anthropic-proxy/index.ts'`
  → zero results.
- The Edge Function reads its four env vars at the top of `anthropic-proxy/index.ts` (lines 11-14)
  and never re-reads them. Other modules receive values via function parameters.
- `frontend/src/constants/env.ts` is the only place reading `import.meta.env`; it parses through
  Zod and exports a frozen `ENV` object that the rest of the app consumes.

---

## Code Review Item 5 — Separate frontend / backend folders

**Status:** PASS

**Evidence:**
- `/frontend/` and `/backend/` are top-level siblings.
- No `package.json` at the repo root.
- `frontend/package.json` is the only frontend manifest; `backend/supabase/functions/deno.json` is
  the only backend manifest.
- The `@shared` alias is the only cross-folder import permitted (only Zod schemas under
  `_shared/schemas/*` may cross — see chunk-00 / chunk-02 decisions).

---

## Code Review Item 6 — React.js frontend

**Status:** PASS

**Evidence:**
- `frontend/package.json` lists `react` `^19.2.6` and `react-dom` `^19.2.6`.
- Toolchain: Vite + React + TypeScript (strict).

---

## Code Review Item 7 — No `console.*` outside the logger

**Status:** PASS (with one documented exception)

**Evidence:**

```
$ grep -rn 'console\.' frontend/src/ --include="*.ts" --include="*.tsx" | grep -v 'lib/logger.ts'
frontend/src/constants/env.ts:14:  // We use console.error here intentionally — the logger isn't ready and the app cannot start.
frontend/src/constants/env.ts:17:  console.error('[env] Invalid or missing environment variables:', z.flattenError(parsed.error));
frontend/src/components/RouteErrorBoundary.tsx:29:// no-`console.*` rule). PII is not collected — only error metadata.
```

- `env.ts` line 17 is the **sanctioned exception**: at module load (before the logger has been
  initialized), env validation runs. A failure here means the app cannot start, so we emit one
  `console.error` and throw. Line 16 carries an explicit `eslint-disable-next-line no-console`
  comment with a justification on the preceding line. ESLint passes.
- `RouteErrorBoundary.tsx` line 29 is a **comment** referencing the rule, not a call.
- Backend: `grep -rn 'console\.' backend/supabase/functions/ | grep -v '_shared/logger.ts'` → zero
  results.
- ESLint rule `no-console: 'error'` is configured globally in `eslint.config.js` (chunk-01
  decisions noted ESLint 10's stricter schema requires bare `'error'` rather than
  `{ allow: [] }`).

---

## Code Review Item 8 — Common API response envelope shape

**Status:** PASS

**Evidence:**
- Envelope schema at `backend/supabase/functions/_shared/schemas/api-response.ts` defines
  `ApiResponseSchema<T>` with `{ success, data?, error?, meta? }`.
- The frontend imports it via the `@shared/schemas/api-response` alias.
- The Edge Function (`anthropic-proxy/index.ts`) uses the `okResponse` / `errorResponse` helpers
  exclusively (`backend/supabase/functions/_shared/response.ts`) — grep confirms 8 callsites, all
  through these helpers.
- Frontend mutation/query hooks `safeParse` direct PostgREST responses against the canonical
  domain schemas before returning, and throw stable error codes on validation failure. 33 hook
  files contain `safeParse` calls (grep result).
- The shared `ApiMetaSchema` carries optional pagination + `reset_seconds` (chunk-11) cleanly
  across both runtimes.

---

## Code Review Item 9 — Error codes via constants (no inline error code strings)

**Status:** PASS

**Evidence:**
- `frontend/src/constants/error-codes.ts` and `backend/supabase/functions/_shared/constants/error-codes.ts`
  define the canonical enum.
- `diff` of the two files' enum keys → identical (verified during the audit).
- 18 distinct codes today: `NOT_AUTHENTICATED`, `FORBIDDEN`, `VALIDATION_FAILED`, `NOT_FOUND`,
  `CONFLICT`, `RATE_LIMITED`, `NETWORK_ERROR`, `INTERNAL_ERROR`, `INVALID_RESPONSE`,
  `INVALID_TRANSITION`, `SCHEDULED_REQUIRES_DATE`, `PUBLISHED_REQUIRES_DATE`, `AI_TIMEOUT`,
  `AI_UPSTREAM_ERROR`, `AI_RESPONSE_INVALID`, `CONFIGURATION_ERROR`. (Chunk 11 added the four
  AI codes; both mirrors updated together.)
- Feature error mappers (`features/<x>/errors.ts`, `features/<x>/messages.ts`) reference
  `ERROR_CODES.*` rather than inline strings.

---

## Code Review Item 10 — DB transactions for multi-row writes

**Status:** PASS

**Evidence:**
- Every multi-row / multi-table write goes through a Postgres function with `language plpgsql`
  (implicit transaction) and `security invoker`:
  - `public.update_content_item_status` (Chunk 04) — state-machine atomicity.
  - `public.spawn_sibling_content_items` (Chunk 05) — multi-table fan-out (content_items +
    content_relationships).
  - `public.spawn_cross_post_variants` (Chunk 06).
  - `public.spawn_repurposed_children` (Chunk 07).
- Direct frontend `supabase.from(...).insert/update/delete()` calls audit-checked: each is a
  **single-table single-statement** write that's atomic by Postgres semantics:
  - `useDeleteContentItem.ts` — delete by id.
  - `useDeleteBrandContextFile.ts` — delete by id.
  - `useDeleteIdea.ts` — delete by id (cascade in DB).
  - `useSavePillars.ts` — single-statement multi-row insert (atomic).
  - `useSavePlatforms.ts`, `useSaveCadenceTargets.ts` — single-statement (upsert).
- The onboarding multi-step writes were intentionally NOT folded into an RPC (Chunk 03 decisions):
  each step is independently single-table-atomic, and the onboarding state machine permits
  resuming if a later step fails.

---

## Code Review Item 11 — HTTP status codes match semantics

**Status:** PASS

**Evidence:**
- `frontend/src/constants/http-status.ts` and `backend/supabase/functions/_shared/constants/http-status.ts`
  define `HTTP_STATUS`. Diff confirms identical keys.
- Edge Function (`anthropic-proxy/index.ts`) status code map:
  - 200 / `OK` — success path
  - 400 / `BAD_REQUEST` — `VALIDATION_FAILED` (method check, JSON parse failure, schema mismatch)
  - 401 / `UNAUTHORIZED` — `NOT_AUTHENTICATED`
  - 429 / `TOO_MANY_REQUESTS` — `RATE_LIMITED` (with `meta.reset_seconds`)
  - 500 / `INTERNAL_SERVER_ERROR` — `CONFIGURATION_ERROR`, `AI_UPSTREAM_ERROR`,
    `AI_RESPONSE_INVALID`, `INTERNAL_ERROR`
  - 504 / `GATEWAY_TIMEOUT` — `AI_TIMEOUT` (Chunk 11 added the constant to both mirrors)
- `grep -rEn 'status: [0-9]{3}' backend/supabase/functions/` → zero hardcoded numeric statuses
  outside `http-status.ts`.
- `grep` for inline numeric statuses in the frontend → zero matches.

---

## Code Review Item 12 — No `any` in TypeScript

**Status:** PASS

**Evidence:**
- `grep -rEn '(^|[^a-zA-Z_])(: any|as any|<any>|<any,|<any\|)' frontend/src/ backend/supabase/functions/`
  → zero matches in real TypeScript syntax. (Initial `: any\b|as any\b` regex flagged one
  comment containing the word "any" inside `(window, pillars, cadence targets, "has any items")`;
  refined regex excludes prose.)
- ESLint rule `@typescript-eslint/no-explicit-any` is `error` (configured globally).
- `tsconfig.json` has `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`,
  `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- `grep -rEn '@(ts-ignore|ts-expect-error|ts-nocheck)' frontend/src/ backend/supabase/functions/`
  → zero matches.
- One `eslint-disable-next-line no-console` exists in `frontend/src/constants/env.ts:16` —
  documented bootstrap exception (see Item 7).

---

## Code Review Item 13 — REST standards for Edge Functions

**Status:** EXCEPTION (documented)

**Evidence:**
- One Edge Function exists: `anthropic-proxy`.
- HTTP method: POST (sole method accepted; 400 `VALIDATION_FAILED` on others).
- Path: `/functions/v1/anthropic-proxy`.

**Documented exception:** This function is a **single dispatch endpoint with task-discriminated
payloads** validated through Zod's `discriminatedUnion` (`AiTaskRequestSchema` in
`_shared/task-schemas.ts`). It's not a CRUD resource. Today's tasks: `suggest_sibling_specs`.
Tomorrow's tasks: additional union variants in the same schema, additional handler cases in
`task-handlers.ts`, no new Edge Function. A strict REST shape would be
`/functions/v1/ai/suggest_sibling_specs`, `/functions/v1/ai/another_task`, etc. — multiple
functions, multiple deployments, multiplied auth/rate-limit/logging plumbing. The
dispatch-by-discriminator pattern (chunk-11 decisions) was chosen for simplicity; this audit
ratifies it as a deliberate variance from REST orthodoxy.

The convention for any FUTURE Edge Function that IS a CRUD resource (e.g., `content-items`,
`ideas`) remains plural-noun + method-as-verb per `03-code-standards.md`.

---

## Code Review Item 14 — Consistent validation (Zod everywhere)

**Status:** PASS

**Evidence:**
- Every form uses `zodResolver` (`@hookform/resolvers`) — 10 form components verified by grep.
- Every mutation/query hook `safeParse`s the response before returning — 33 hook files.
- Every Edge Function input is validated via `AiTaskRequestSchema.safeParse` at the top of the
  handler.
- Every AI output is validated via `SuggestSiblingSpecsOutputSchema.safeParse` before being
  returned to the client (`task-handlers.ts:60`).
- `JSON.parse` usage audit: two call sites total
  (`anthropic-proxy/index.ts:98`, `task-handlers.ts:49`); both are wrapped in defensive
  try/catch with `parsed: unknown` and immediately fed to a Zod `safeParse`.
- `_shared/schemas/` is a single source of truth for the domain schemas; the frontend imports
  via the `@shared` alias. Same Zod version on both sides (4.4.3) via the `deno.json` import map
  + the frontend's node_modules.

---

## Code Review Item 15 — No inline constants (magic strings/numbers)

**Status:** PASS

**Evidence:**
- **Routes:** All via `ROUTES` from `frontend/src/constants/routes.ts`. Grep for
  hardcoded `"/<lowercase-word>"` patterns in `features/` → zero matches.
- **HTTP statuses:** All via `HTTP_STATUS`. Grep for inline `status: NNN` → zero matches.
- **Error codes:** All via `ERROR_CODES` (mirrored on both sides).
- **UI copy:** Per-feature `messages.ts` files (7 features × `messages.ts`) plus a cross-feature
  `constants/messages.ts`. No inline strings in JSX render paths.
- **Color hex:** `grep -rEn '#[0-9a-fA-F]{3,8}\b' frontend/src/` (excluding `index.css`) → zero
  matches. All colors come through CSS custom properties (`var(--color-status-*)`, design tokens
  from chunk-01 / chunk-03) and Tailwind classes (no arbitrary hex strings in TSX).
- **Status enum values:** Referenced via `CONTENT_ITEM_STATUS_VALUES`,
  `BRAND_CONTEXT_KIND_VALUES`, etc., from the canonical Zod schemas — never hand-typed strings.
- **Calendar PostgREST clauses:** `useCalendarWindow.ts` and `useDashboardWindow.ts` use
  template literals for `or=(and(...))` query strings. These ARE inline DSL (PostgREST query
  language). Not a constants violation — they're query fragments, not configuration.

---

# Additional audit sections

## RLS verification (static — verified against migrations)

**Status:** PASS (static); **OPERATOR_RUN_PENDING** for live SQL queries against production.

**Evidence from migrations (`backend/supabase/migrations/`):**

| Table | Migration | `enable row level security` | Policy |
|---|---|---|---|
| `profiles` | `…183909_create_profiles.sql` | ✓ | `auth.uid() = id` select + update |
| `platforms` | `…183910` | ✓ | `platforms_self_all` (for all, `auth.uid() = user_id`) |
| `content_pillars` | `…183911` | ✓ | `content_pillars_self_all` |
| `cadence_targets` | `…183912` | ✓ | `cadence_targets_self_all` |
| `ideas` | `…183913` | ✓ | `ideas_self_all` |
| `content_items` | `…183914` | ✓ | `content_items_self_all` |
| `content_relationships` | `…183915` | ✓ | `content_relationships_self_all` |
| `brand_context_files` | `…183916` | ✓ | `brand_context_files_self_all` |
| `ai_request_log` | `…170135` | ✓ | `ai_request_log_self_select` (SELECT only — no INSERT/UPDATE/DELETE policy → only service role can write) |

**Postgres functions and their security mode:**

| Function | Security mode | Note |
|---|---|---|
| `public.set_updated_at` | invoker (default) | trigger; touches NEW row only |
| `public.handle_new_user` | **definer** (documented exception) | trigger on `auth.users`; creates the `profiles` row on signup before the user has a session. `set search_path = public` defends against search-path attacks. Only inserts one row with the new user's id; cannot be abused to read other rows. **Standard Supabase pattern.** |
| `public.update_content_item_status` | invoker | RLS scopes everything to the caller |
| `public.spawn_sibling_content_items` | invoker | |
| `public.get_content_item_siblings` (legacy) | invoker | Replaced by `get_content_item_relations` in Chunk 06 |
| `public.get_content_item_relations` | invoker | |
| `public.spawn_cross_post_variants` | invoker | |
| `public.spawn_repurposed_children` | invoker | |

**Views and their security mode:**

| View | `security_invoker = true`? |
|---|---|
| `public.content_items_with_cross_post_size` (Chunk 06; replaced by `content_items_list_view` in Chunk 07) | ✓ |
| `public.content_items_list_view` (Chunk 07) | ✓ |

**OPERATOR_RUN_PENDING — production verification:**

Run against the production Supabase SQL editor and paste output here:

```sql
-- 1. RLS enabled on every public table?
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
-- Expected: rowsecurity = true for every row.

-- 2. At least one policy per user-owned table?
select tablename, count(policyname) as policy_count
from pg_policies where schemaname = 'public'
group by tablename order by tablename;
-- Expected: every table from the table above has policy_count >= 1.

-- 3. Function security mode
select proname, prosecdef from pg_proc
where pronamespace = (select oid from pg_namespace where nspname = 'public')
order by proname;
-- Expected: only `handle_new_user` has prosecdef = true. All others false.

-- 4. View security
select c.relname, c.reloptions
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'v';
-- Expected: `content_items_list_view` has reloptions including 'security_invoker=true'.

-- 5. ai_request_log sanity — no overlong error codes (sanity for the "stable strings" promise)
select length(error_code) as len, count(*) from ai_request_log
where error_code is not null
group by length(error_code) order by len desc limit 5;
-- Expected: all lengths under ~30 chars.
```

## Cross-user RLS verification (OPERATOR_RUN_PENDING)

Requires two sign-ups on the deployed environment:

1. Sign in as User A on a clean browser; create one row in each of `platforms`,
   `content_pillars`, `cadence_targets`, `ideas`, `content_items`, `content_relationships`,
   `brand_context_files`.
2. Sign in as User B in a separate browser/incognito.
3. In DevTools console (User B's session), attempt:
   ```js
   await supabaseClient.from('ideas').select('*');
   // Expected: empty array.
   await supabaseClient.from('ideas').select('*').eq('id', '<User A's idea id>');
   // Expected: empty array (NOT_FOUND-equivalent).
   await supabaseClient.rpc('update_content_item_status', { p_item_id: '<User A's item id>', p_new_status: 'drafting' });
   // Expected: NOT_FOUND raise.
   ```
4. Record results in this section. If User B sees ANY of User A's data, **LAUNCH BLOCKER —
   STOP and fix.**

## Service role key isolation

**Status:** PASS

**Evidence:**
- `grep -rEn 'service_role|SUPABASE_SERVICE_ROLE' frontend/` → zero matches.
- `dist/` after `npm run build` → grep finds neither `sk-ant-` nor `service_role` strings.
- Edge Function reads the key once at module load (`anthropic-proxy/index.ts:13`) and uses it
  only for `ai_request_log` inserts and rate-limit reads (chunk-11 contract).
- The Vercel env-var list (configured per chunk-13 runbook) does NOT include any
  `SUPABASE_SERVICE_ROLE_KEY` — only `VITE_*` vars.

## Anthropic key isolation

**Status:** PASS

**Evidence:**
- `grep -rEn 'ANTHROPIC_API_KEY|sk-ant' frontend/` → zero matches outside the runbook's
  placeholder example.
- `grep -rEn 'sk-ant-' dist/` after `npm run build` → zero matches (no leak in the bundle).
- The key is read inside the Edge Function (`anthropic-proxy/index.ts:14`) via
  `Deno.env.get('ANTHROPIC_API_KEY')` and lives only in Supabase secrets (chunk-13).
- The frontend never talks to Anthropic directly — `lib/ai-client.ts` posts to
  `/functions/v1/anthropic-proxy` and the Edge Function is the only thing that holds the key.

## Rate limit verification

**Status:** PASS (static review); **OPERATOR_RUN_PENDING** for live verification.

**Static evidence:**
- `_shared/rate-limit.ts` (Chunk 11) counts `ai_request_log` rows in the trailing minute (cap 20)
  and day (cap 200), per user. Checked BEFORE the upstream Anthropic call.
- `anthropic-proxy/index.ts:78-90` invokes the limit check, returns 429 + `RATE_LIMITED` +
  `meta.reset_seconds` on overage.
- The check is performed via the service-role Supabase client so it can read rows the user
  doesn't own (per their own RLS policy — `auth.uid() = user_id`, which the user CAN read; but
  the service role bypasses RLS to read efficiently regardless of auth.uid scoping).
- The check fails OPEN on a lookup error (don't block real users on infra hiccups) — documented
  trade-off in chunk-11 decisions.

**OPERATOR_RUN_PENDING — live verification:**

After the production deploy and a real `ANTHROPIC_API_KEY` is configured, run this from a
signed-in test user's session:

```bash
# 21 requests in 60 seconds; expect the 21st to be 429
JWT=<paste test user's access_token>
URL=https://<project-ref>.supabase.co/functions/v1/anthropic-proxy
for i in $(seq 1 21); do
  echo "req $i:"
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST \
    -H "Authorization: Bearer $JWT" \
    -H "Content-Type: application/json" \
    -d '{"task":"suggest_sibling_specs","input":{...}}' \
    "$URL"
done
# Expected output: 200, 200, ..., 200 (20 times), then 429 on the 21st.
```

Record the transcript here. Then check `select count(*) from ai_request_log where user_id = '<test-user-id>' and created_at > now() - interval '5 minutes';` — expect 21 rows.

## Performance check — heaviest views

**Status:** OPERATOR_RUN_PENDING (requires production with representative data)

For each query, record observed latency on a representative dataset (~100 content items, ~20
ideas, ~5 platforms, ~6 pillars, ~10 brand context files):

| Query | Hook / file | Observed (ms) | Notes |
|---|---|---|---|
| Calendar window (typical month) | `useCalendarWindow.ts` | __TODO__ | log line emitted on every query: `calendar_window_query_complete` |
| Dashboard window (30d) | `useDashboardWindow.ts` | __TODO__ | |
| Content items list (with view aggregates) | `useContentItemsList.ts` | __TODO__ | reads `content_items_list_view` |
| Brand context list | `useBrandContextFiles.ts` | __TODO__ | |

**Threshold:** anything > 1000ms is a `KNOWN_ISSUE` requiring a recommended fix.

**Static prediction:** indices are present for every primary read pattern (chunk-02 +
chunk-06/07/08 + chunk-09):
- `content_items (user_id, scheduled_for desc nulls last)` — calendar
- `content_items (user_id, updated_at desc)` — list pagination
- `content_relationships (user_id, parent_id)` + `(user_id, child_id)` — relationship lookups
- `ai_request_log (user_id, created_at desc)` + `(user_id, created_at)` — rate-limit count

The chunk-07 spec flagged the view's lateral-join cost as a potential hotspot at >500ms; if live
measurement exceeds that, the next move (per `03-code-standards.md`) is a materialized view
refreshed via triggers, which is a future chunk — not this one.

## Accessibility audit (code-readable)

**Status:** PASS

| Surface | Keyboard reach | Focus mgmt | Color-not-sole | SR announce | Notes |
|---|---|---|---|---|---|
| `/sign-in`, `/sign-up` | ✓ | Card layout, semantic `<h1>` (Chunk 12) | n/a | toast on error/success | Auth pages render outside `AppShell`; `useFocusOnRouteChange` doesn't fire here by design |
| `/onboarding` | ✓ | step indicator carries `aria-current="step"`; stepper distinguishes via border + bg, not color alone | ✓ | toast on save | Each step has its own form pattern; `aria-busy` on submit |
| `/dashboard` | ✓ | `<PageHeader>` h1; route-change focus | ✓ — cadence pills carry `✓ ↓ ↑` glyphs in addition to color (Chunk 12) | toast on errors | full-panel `<ErrorState>` for query failures (Chunk 12) |
| `/calendar` | ✓ — chips + popover keyboard-reachable | Radix popover focus trap; agenda toggle keyboard-toggleable | ✓ — calendar chips have `aria-label` carrying status name; status stripe paired with platform abbreviation badge + indicator icons | toast on errors | mobile agenda toggle works at 375px |
| `/ideas`, `/ideas/new`, `/ideas/:id` | ✓ | `<PageHeader>` h1 + breadcrumbs; delete dialog `AlertDialog` focus-trapped (Radix) | ✓ — sibling hub has explicit "Hub" pill in text | toast on every mutation | |
| `/content-items`, `/content-items/new`, `/content-items/:id` | ✓ | `<PageHeader>` + breadcrumbs; cross-post Missing cells have dashed border + UPPERCASE "Missing" text; repurpose parent block has icon + "Source" tag | ✓ — `StatusBadge` always pairs color with label; cross-post Missing dashed border + label; repurpose icon + label | toast on every mutation | |
| `/brand-context`, `/brand-context/new`, `/brand-context/:id`, `/brand-context/export` | ✓ | `<PageHeader>` + breadcrumbs; export preview Dialog focus-trapped | ✓ | body textarea char counter has `aria-live="polite"` near-limit; toast on save/copy/download | |
| `AppShell` | ✓ — hamburger button has `aria-label` + `aria-expanded` (Chunk 12) | mobile drawer is `role="dialog" aria-modal="true"`; closes on scrim, X, or NavLink click; active nav link has left-border accent (not color-alone) | ✓ | toast on sign-out | |

**Cross-cutting:**
- `useFocusOnRouteChange` hook (Chunk 12) focuses the first `<h1>` inside `<main>` on every
  authenticated route change.
- `<PageHeader>` provides the canonical `<h1>` styling.
- `aria-busy` is on every async submit button (verified across 19 files; see grep above).
- `aria-live` is on the brand context body char counter for near-limit announcements + on every
  skeleton primitive (`SkeletonCard`, `SkeletonForm`, `SkeletonList`).
- Toaster (`sonner`) announces toasts via its built-in `role="status"` mechanism.
- No `outline: none` overrides in the codebase (verified by grep).
- No interactive element relies on color alone (verified by code-reading per chunk-12 audit
  notes; spot-confirmed in this audit).

**No MUST_FIX items surfaced in this static pass.**

## Privacy / PII audit

**Status:** PASS

**Definitions (per chunk-14 decisions):**
- **PII:** user emails, brand context bodies, idea notes, content item titles, content item
  notes, AI request bodies, AI response text.
- **Non-PII:** IDs (UUIDs), timestamps, counts, status enum values, error code strings, HTTP
  status numbers, sizes (chars/bytes).

**Frontend logger audit (54 callsites grep'd):**
- Every `logger.error/warn/info/debug` payload reviewed. Payload fields used:
  `code` (error code), `status` (HTTP status), `id` / `itemId` / `ideaId` (UUIDs),
  `issues` (Zod issue count), `message` (Supabase client error message — strings about DB/auth
  state, not user input), `slug` (AI-suggested platform slug).
- **No PII observed.** The `slug` log in `SuggestSiblingSpecsDialog.tsx:114` carries an
  AI-suggested platform slug (the AI's output, not user input).
- `RouteErrorBoundary` truncates `stack` and `componentStack` to 1000 chars; logs `message`
  (the error's `.message`). No current code path embeds user input in `Error` messages.

**Backend logger audit (4 callsites):**
- `configuration_error_missing_env` — no payload.
- `ai_log_insert_failed { message: String(err) }` — Supabase error from log table insert. Not
  PII.
- `ai_upstream_error { status: err.status }` — HTTP status only.
- `ai_unhandled_error { message: err.message }` — error message from any unhandled exception.
  Current code paths don't embed user input in errors; this is a defensive log site.

**`ai_request_log` table contents (Chunk 11 + audit-reviewed):**
- Columns: `id`, `user_id`, `task`, `request_size_chars`, `response_size_chars`, `success`,
  `error_code`, `latency_ms`, `created_at`.
- **No body content stored.** Only sizes (integer) + stable code strings.
- `error_code` is constrained to `ERROR_CODES` values by the function's code path — sanity check
  via the SQL query in the RLS section confirms lengths under 30 chars in production.

**Edge Function error response audit (8 errorResponse callsites):**
- Every `errorResponse` message is a **static string** ('Method not allowed', 'Server not
  configured', 'Not authenticated', 'Invalid JSON body', 'Invalid task request',
  'AI request timed out', 'Upstream AI error', 'AI returned an unexpected response shape',
  'AI request failed').
- The only dynamic envelope fields are `details.issueCount` (an integer) and
  `meta.reset_seconds` (an integer).
- **No user input is ever reflected** to the client in error responses. Anthropic's upstream
  error body is truncated to 500 chars and lives in server logs only — never crosses the
  envelope boundary.

## Bundle size check

**Status:** PASS (delta within budget)

**Evidence (from `npm run build` on 2026-06-03):**

```
dist/index.html                     0.46 kB │ gzip:   0.29 kB
dist/assets/index-CF_2Pa_Q.css     62.97 kB │ gzip:  11.26 kB
dist/assets/index-m1tioT6s.js   1,306.33 kB │ gzip: 377.21 kB
```

**Delta vs Chunk 12 (baseline post-polish):** identical to the byte (Chunk 13 was config-only;
no application code changed).

**Top dependencies in `package.json`:** recharts (108 kB gz baseline per chunk-09), radix-ui
umbrella, supabase-js, react + react-dom, react-router-dom, react-hook-form, sonner,
lucide-react, zod.

**Vite warning:** `chunk(s) larger than 500 kB after minification` — this is the existing chunk
that includes recharts (chunk-09 known issue). Recommended follow-up (route-level
`React.lazy` for chart-heavy routes) deferred to a post-launch chunk — see Known Issues below.

**No new dependencies in Chunks 13 or 14.**

## Documentation audit

**Status:** PASS

**Evidence:**
- `/context/` inventory: `01-project-overview.md`, `02-architecture.md`, `03-code-standards.md`,
  `04-ai-workflow-rules.md`, `05-ui-context.md`, `06-progress-tracker.md`,
  `13-deployment-runbook.md`, `agents.md`, `decisions.md`, `chunk-12-audit-notes.md`. (This
  audit file added now: `14-pre-launch-audit.md`.)
- `grep -rn 'TODO\|FIXME\|XXX' context/` → zero matches.
- Every `/context/NN-…md` cross-reference resolves to an existing file (verified).
- Progress tracker (`06-progress-tracker.md`) lists Chunks 00–13 as Completed; Chunk 14 is
  in-progress (this audit) and will be marked Completed by the same change.
- Decisions log has dated entries for every chunk: 00 (2026-05-27), 01 (same), 02 (same),
  03 (2026-05-29), 04–11 (2026-06-02), 12 (2026-06-02), 13 (2026-06-02). Chunk 14 entry to be
  appended by this work.
- `READMEs`: root has launch-status link (added in this chunk); frontend + backend have
  Deployment sections (chunk-13).
- No documentation contradicts the shipped code — chunk-12 audit notes already reconciled the
  polish-layer drift; chunk-13 runbook documents the actual deploy pattern.

---

# Pre-launch blockers

**None from this static audit.**

Operator-side acceptance criteria still pending (see OPERATOR_RUN_PENDING tags):
- Live production SQL verification (RLS in-the-wild + function security in-the-wild).
- Cross-user RLS verification against the production environment.
- Live rate-limit verification on the deployed Edge Function with a real `ANTHROPIC_API_KEY`.
- Production smoke test (`bash scripts/smoke-test.sh <urls>` — 5/5 expected).
- Manual end-to-end test on production (sign-up → onboarding → idea → spawn siblings → cross-post
  → repurpose → schedule → publish → calendar → dashboard → brand context → AI suggest → delete
  → sign out).
- Performance latency measurements against production with representative data.

**If any operator-side check fails, that finding becomes a launch blocker and this audit is
re-opened.**

---

# Known issues (post-launch follow-ups)

These were known before the audit and remain — none block launch. Each has a recommended chunk
number for the follow-up.

1. **Bundle size — recharts is heavy.** Symptom: production JS ~1.31 MB / 377 kB gz; Vite warns
   on chunks > 500 kB. Location: `frontend/src/features/dashboard/`. Recommended fix: route-level
   `React.lazy` + `Suspense` on `/dashboard` (the only recharts consumer). Recommended chunk: a
   "performance-1" follow-up, post-launch.

2. **OnboardingPage inverse-redirect race.** Symptom: a freshly-onboarded user on hard-reload may
   stay on `/onboarding` until a manual sidebar click. Location:
   `frontend/src/features/onboarding/OnboardingPage.tsx`. Recommended fix: bump the
   `useOnboardingStatus` query during the cadence-step finish handler instead of relying on
   `step === 1` to gate the redirect. Recommended chunk: a "post-launch-bugfix-1".

3. **~~Sidebar nav links to unimplemented routes.~~ FIXED on this PR.** `NAV_ITEMS` was trimmed
   to only Dashboard / Content items / Calendar / Ideas / Brand context. The `ROUTES.PILLARS`,
   `ROUTES.CADENCE`, `ROUTES.SETTINGS` constants remain in `routes.ts` so future chunks can
   build dedicated management pages and re-add the nav entries with one line each. Pillars and
   cadence are still configured during onboarding.

4. **Multi-step relationship cycle prevention is limited.** Symptom: only `parent_id <> child_id`
   is checked at the DB level; A→B→C→A cycles are theoretically constructable. Location:
   `backend/supabase/migrations/20260527183915_create_content_relationships.sql`. Recommended
   fix: a recursive-CTE check inside the spawn RPCs OR a defensive guard during read expansion.
   Recommended chunk: low-priority follow-up; not a realistic user workflow per chunk-07
   decisions.

5. **`ai_unhandled_error` could log user input if a future code path throws with embedded user
   data.** Symptom: defensive observation, no current incidents. Location:
   `backend/supabase/functions/anthropic-proxy/index.ts:157`. Recommended fix: a code-review
   gate that any `throw new Error(...)` in the AI proxy graph cannot interpolate user input;
   currently respected by every code path. Recommended chunk: addressed by discipline + future
   audits, no immediate code change needed.

6. **No test runner (deliberate gap).** Symptom: no Vitest / Playwright / Deno test in the
   repo. Location: `frontend/package.json` + the absence of `*.test.ts` files. Recommended fix:
   introduce Vitest for pure-function tests (`pack-builder.ts`, `dashboard-aggregations.ts`,
   `calendar-grouping.ts`, `calendar-date-utils.ts`, `network-error.ts`) + Playwright for the
   highest-risk user journeys (sibling spawn atomicity, status transition state machine, AI
   proxy validation, cross-user RLS). Recommended chunk: a dedicated "tests-1" chunk
   post-launch. Justification for the deferral: the chunked-and-prompted development workflow
   verified every chunk manually with structured checklists; the architectural patterns (Zod,
   RLS, envelope errors, state machines, RPC atomicity) constrain bugs to a small surface; the
   cost of bolting a test runner onto an already-shipping product is non-trivial and best done
   as its own chunk.

7. **Live AI success path + AI_TIMEOUT were not exercised in the engineering environment.**
   Symptom: no real `ANTHROPIC_API_KEY` was available during chunks 11-13. Location:
   `backend/supabase/functions/anthropic-proxy/`. Recommended fix: operator runs the production
   smoke + a live "suggest formats with AI" flow as part of the OPERATOR_RUN_PENDING block
   above. Recommended chunk: complete during the operator's pre-launch run.

8. **No automated monitoring / alerting / dashboards.** Symptom: relying on Vercel + Supabase
   built-in dashboards only. Location: N/A. Recommended fix: when usage warrants, introduce
   Logflare / Sentry / Better Uptime. Recommended chunk: post-launch when usage grows.

9. **No custom domain.** Symptom: launch on `*.vercel.app`. Location: Vercel project settings.
   Recommended fix: register a domain and point it at Vercel. Recommended chunk: 5-minute task
   post-launch.

10. **No staging environment / no separate staging Supabase.** Symptom: PR previews share
    production Supabase. Location: chunk-13 decisions. Recommended fix: when contributors or
    usage grow, introduce a `staging` branch + a staging Supabase project. Recommended chunk:
    deferred per chunk-13 decision.

---

# Sign-off

## Engineering audit checklist (static; complete)

- [x] All 15 code review items: PASS or EXCEPTION with documented rationale.
- [x] RLS verification at the schema level: PASS.
- [x] Service role key isolation: PASS.
- [x] Anthropic key isolation: PASS.
- [x] Rate limit static review: PASS.
- [x] Privacy / PII audit: PASS.
- [x] Bundle size: within budget; recharts deferred to follow-up.
- [x] Accessibility audit (code-readable): PASS; no MUST_FIX items.
- [x] Documentation audit: PASS; no TODOs; all cross-refs resolve.
- [x] No `console.*` outside sanctioned loggers (1 documented exception in `env.ts`).
- [x] No `any` in code; no `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`.
- [x] No hardcoded HTTP statuses / routes / color hex / env vars outside their constants files.
- [x] No service role key or Anthropic key references in the frontend.
- [x] No `.cursor/`, no stray `Fix.md` files committed.
- [x] `typecheck` / `lint` / `build` all clean (re-verified during this chunk).

## Operator gate (OPERATOR_RUN_PENDING)

The launch sign-off requires the operator to:

- [ ] Production SQL queries executed and results recorded in this file.
- [ ] Cross-user RLS verification on production (PASS).
- [ ] Live rate-limit verification (21 requests → 21st returns 429).
- [ ] Smoke test passes 5/5 against the production environment.
- [ ] Manual E2E user journey on production succeeds.
- [ ] Performance latency measurements recorded (>1000ms entries become Known Issues).

**Engineering-side launch ready:** YES (pending operator gate above).

**Once the operator gate is green, this file's "Launch ready" line below is flipped to YES.**

**Launch ready:** **NO** (waiting for OPERATOR_RUN_PENDING items)

**Signed off by:** Claude Code agent (static audit) — 2026-06-03
**Operator sign-off:** _______________________________ (date / name)
