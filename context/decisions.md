# Decisions Log

A chronological log of architectural decisions, with date and rationale. Append-only. If a decision is reversed, add a new entry that supersedes the old one; do not edit history.

## 2026-05-27 — Chunk 00 — Initial architecture decisions
- Single repo, two top-level folders: `/frontend`, `/backend`. Each self-contained. No root `package.json`, no workspaces. Rationale: minimum ceremony; the two sides genuinely don't share node dependencies (frontend is Node/Vite, backend is Deno).
- Tech stack: Vite + React + TS (frontend); Supabase Postgres + Auth + Edge Functions on Deno (backend). Rationale: matches the code review document's "frontend in React" requirement; Supabase covers DB + auth + serverless secrets in one vendor.
- Direct SPA-to-Supabase access for non-secret operations; Edge Functions only for secret-holding operations. Rationale: minimizes backend surface area; RLS is the authorization boundary.
- Zod schemas as the single source of truth for validation, shared across folders via the `@shared` Vite/TS alias. Rationale: code review item #14 (consistent validation); same Zod version on both sides via `npm:zod` specifier in Deno.
- The `@shared` alias is the only sanctioned cross-folder import. Rationale: a hard rule prevents creeping coupling between the two folders.
- No `any`, no inline magic, no `console.*` outside the logger. Rationale: code review items #7, #9, #11, #12, #15.
- All `.md` files outside `/context`, `/feature-specs`, and the three sanctioned root files (`README.md`, `CLAUDE.md`, `AGENTS.md`) are gitignored. Rationale: code review item #1 (no stray fix notes).
- `.cursor/` gitignored. Rationale: code review item #2.
- Edge Functions runtime is Deno (Supabase default). Rationale: zero deviation from Supabase's supported path.

## 2026-05-27 — Chunk 00 — Notes for a future chunk
- The Chunk 00 spec's Acceptance Criteria states `/context/` should contain "exactly nine files," but the spec's own folder diagram and the "seven listed files plus `decisions.md`" wording enumerate exactly **eight** named files (`01`–`06`, `agents.md`, `decisions.md`). No ninth file is named anywhere in the spec. Resolution: built the eight explicitly-named files and treated "nine" as a counting error in the prose. If a ninth context file was intended, the next chunk should name it and add it here.

## 2026-05-27 — Chunk 01 — Foundational standards (planned decisions)
- Package manager: `npm`. Ships with Node; matches Vercel/Netlify defaults; no extra install step.
- Node pinned via `.nvmrc` to `20` (LTS) for deploy parity with Vercel/Netlify/Supabase CLI. Local dev ran on Node 24 (backward-compatible for Vite/TS/ESLint); `.nvmrc` declares the deploy target, not the local runtime.
- ESLint flat config (`eslint.config.js`), not legacy `.eslintrc.*`. ESLint 9+ defaults to flat config.
- Tailwind v3, not v4 (installed 3.4.x). The shadcn ecosystem still assumes v3; Chunk 03 needs shadcn. Revisit in ~6 months.
- Logger interface: `logger.debug|info|warn|error`, each `(event: string, data?: Record<string, unknown>) => void`. Structured logging from day one; `event` is a stable grep key; `data` never carries user PII.
- Env-var access: `frontend/src/constants/env.ts` reads `import.meta.env` once, validates with a Zod schema, exports a frozen typed `ENV`. Feature code imports `ENV.*`, never raw env. Bad/missing config fails fast at app start.
- Route constants: `ROUTES.SOMETHING` for static paths; for parameterized routes, both a pattern (`IDEA_DETAIL_PATTERN = '/ideas/:id'`) and a builder (`ideaDetail(id) => '/ideas/${id}'`).
- No barrel (`index.ts`) files inside `frontend/src/features/`. Direct imports only — barrels mask cycles, slow Vite cold-start, and hurt grep. Re-export-only barrels permitted in `constants/`/`types/` if they materially help call sites.
- CSS strategy: Tailwind utilities + CSS custom properties for theme tokens (status colors as `--color-status-*`). Matches shadcn; future dark mode is a variable swap.

## 2026-05-27 — Chunk 01 — Toolchain landed newer than the spec's example configs (adaptations)
`npm create vite@latest` produced a toolchain newer than the spec assumed: React 19.2, Vite 8.0, TypeScript 6.0, ESLint 10.4, typescript-eslint 8.60, Zod 4.4. The following adaptations preserve every locked-in rule and intent. `typecheck`, `lint --max-warnings 0`, and `build` all pass.
- **ESLint 10 + dropped `eslint-plugin-react`** (confirmed with the human). `eslint-plugin-react@7` peer-caps at ESLint `^9.7`, so installing it on ESLint 10 fails with ERESOLVE. Force-install is forbidden by the workflow rules, so we kept ESLint 10 and removed `eslint-plugin-react`. Retained `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` (both support ESLint 10) and ALL required rules: `@typescript-eslint/no-explicit-any` (error), `ban-ts-comment` (allow-with-10-char-description), `no-unused-vars`, and core `no-console` (off only in `src/lib/logger.ts`). Trade-off: lose eslint-plugin-react's general React rules; the important hook rules remain. Revisit when eslint-plugin-react supports ESLint 10.
- **`tseslint.configs.strictTypeChecked`** used per the spec's "strictest realistic" intent, with `parserOptions.project` pointing at both tsconfigs. `globals.browser` added (matches the create-vite default) to avoid `no-undef` ambiguity on DOM globals.
- **`no-console` option**: ESLint 10 rejects `{ allow: [] }` (empty array fails its schema). Used bare `'no-console': 'error'` — same intent (blocks all `console.*`).
- **TypeScript 6.0 deprecated `baseUrl`** (stops functioning in TS 7). Removed `baseUrl` from `tsconfig.json`; `paths` are config-relative so they resolve without it. Vite aliases unaffected (absolute paths in `vite.config.ts`).
- **`build` script** set to `tsc --noEmit && vite build` (not the scaffold's `tsc -b && vite build`) to suit the spec's 2-file tsconfig structure (root includes `src`; `tsconfig.node.json` covers `vite.config.ts`) and avoid project-reference build-mode emit. Deleted the scaffold's orphaned `tsconfig.app.json`.
- **Zod v4 API**: `z.record(z.string(), z.unknown())` (two-arg form; single-arg removed in v4); `z.flattenError(err)` instead of the deprecated `ZodError.flatten()` (deprecated APIs are an ERROR under `no-deprecated`, which `strictTypeChecked` enables); and `z.ZodType` instead of the deprecated `z.ZodTypeAny` for the envelope generic constraint.
- **Added `src/vite-env.d.ts`** (`/// <reference types="vite/client" />`). The spec's `tsconfig.json` omits the scaffold's `types: ["vite/client"]`, so `import.meta.env` needs the ambient reference. Standard Vite convention.
- **Boilerplate cleanup**: deleted `src/assets/` (hero.png, react.svg, vite.svg), `public/icons.svg`, `src/App.css`, and the now-vestigial `/frontend/.gitkeep`. Kept `public/favicon.svg` (referenced by `index.html`); set `index.html` `<title>` to `ContentEngine`. (The spec's deletion list named the older create-vite asset paths; the current scaffold ships different demo assets.)

## 2026-05-27 — Chunk 01 — `@shared` alias verified config-only
- The `@shared` alias is configured in both `frontend/vite.config.ts` and `frontend/tsconfig.json`, pointing at `../backend/supabase/functions/_shared`. Per the spec's safer option, resolution was verified **config-only** (matching paths in both files); no stub was placed in `/backend/`, which is Chunk 02's exclusive territory. Chunk 02 verifies end-to-end resolution when it creates the schemas folder. No `@shared/*` symbol is imported yet, so type-check is unaffected.

## 2026-05-27 — Chunk 02 — Schema, RLS, and the `_shared` folder (planned decisions)
- Supabase CLI **2.90.0** used (spec required ≥1.150). Docker 29.4.2, Deno 2.7.14, psql 18.3 available.
- UUID primary keys via `gen_random_uuid()` (pgcrypto). `updated_at` maintained by the `set_updated_at()` trigger, not app code. Hard deletes with `on delete cascade` (no soft delete in MVP).
- Status/format/kind/slug/relationship enums implemented as `text` + `check (… in (…))` constraints, not Postgres `enum` types (easier to evolve).
- `content_relationships` is one join table with a `relationship_type` discriminator (`sibling | cross_post | repurposed_from`); one row per logical edge; `check (parent_id <> child_id)` and `unique (user_id, parent_id, child_id, relationship_type)`.
- Composite indices prefixed on `user_id` for every read pattern (RLS filters on `user_id`, so it must be the index prefix).
- `[auth.email] enable_confirmations = false` for local dev (no mailbox chasing). Production enables confirmations via the hosted dashboard.
- `seed.sql` runs on `supabase db reset` (local only; production never seeds). `verify-rls.sh` and `seed-demo-data.sh` are dev conveniences, not CI.

## 2026-05-27 — Chunk 02 — Adaptations vs. the spec's example text
- **Zod 4.4.3, not `npm:zod@3.23.8`.** The locked decision says frontend/backend Zod versions must match; Chunk 01 installed Zod 4.4.3, so the backend uses 4.4.3 too. The `_shared/schemas/api-response.ts` uses the Zod v4 forms (`z.record(z.string(), z.unknown())`, `z.ZodType`) — identical to the frontend file that already passed type-check in Chunk 01.
- **Bare `zod` import + `deno.json` import map (not `npm:zod` in the shared files).** The frontend re-exports the runtime schema from `@shared/schemas/api-response`, so `tsc` type-checks that backend file. A literal `npm:zod` specifier is unresolvable under Node/bundler resolution and breaks `npm run typecheck`. Resolution: shared files `import { z } from 'zod'`; Deno resolves it via `backend/supabase/functions/deno.json` (`"zod": "npm:zod@4.4.3"`), the frontend via its own `node_modules`. The `npm:` specifier lives ONLY in `deno.json` — it never leaks into the frontend, satisfying the spec's "no Deno-only imports cross the boundary" requirement. Runtime schemas DO cross (that is the whole point of `@shared` — single-source validation); only the Deno-specific specifier does not.
- **`frontend/tsconfig.json` paths gained `"zod": ["./node_modules/zod"]`.** The `@shared` files live outside `/frontend`, so `tsc` could not resolve their bare `zod` import relative to their own location. Mapping `zod` to the frontend's copy lets `tsc` resolve it; normal frontend `zod` imports are unaffected (same target). This is the one additional frontend change beyond the spec's `api-response.ts` re-export.
- **New-style Supabase keys.** CLI 2.90.0 emits `sb_publishable_…` / `sb_secret_…` (and `supabase status -o env` also exposes legacy `ANON_KEY` / `SERVICE_ROLE_KEY`). The anon/publishable key is the `apikey`; the user's JWT (from signup) carries identity for RLS. `verify-rls.sh` reads `API_URL` + `ANON_KEY` from `supabase status`.
- **Demo user seeded directly into `auth.users`.** The spec waffled (it suggested avoiding `auth.users` inserts, but also required a demo user + data on `db reset`). Direct insert is the standard local-dev approach and makes `db reset` self-contained; only `id` is NOT NULL without a default on this GoTrue version, and the `on_auth_user_created` trigger creates the profile. No `auth.identities` row is created, so password login for the seeded user may not work — for a loggable account, sign up via the app and run `seed-demo-data.sh`.
- **`functions/deno.json` added** (not in the spec's `_shared` tree) as the cross-runtime import map described above. `functions/.gitkeep` is also present per the spec (no Edge Function logic yet).
- **Cross-field check constraints kept at the DB level.** The `content_items` transition guards (`status='scheduled'` ⇒ `scheduled_for`; `status='published'` ⇒ `published_at`) and the relationship guards live in the migrations; the entity Zod schemas validate field-level shape only (matching the spec's `platform.ts` pattern). Later chunks can add `.refine()` to create/update input schemas.
- **`platform.display_name`** Zod is `min(1).max(100)` (spec-provided) while the DB column is unconstrained `text not null` — a deliberate app-level cap, kept as the spec wrote it.
- **One change of mandated ports → none (kept spec ports).** The spec's ports (54321/54322/54323) were held by the developer's running `specforge` stack. With the human's go-ahead, `specforge` was stopped (reversible) so ContentEngine uses the spec's exact ports; `buildmap-backend` (553xx) was untouched.

## 2026-05-29 — Chunk 03 — Auth, routing, onboarding (planned decisions)
- Session persistence: Supabase JS default (localStorage). SPA, no SSR. XSS risk mitigated by React escaping + a CSP in Chunk 13.
- Auth UI: email/password only in MVP. OAuth (Google) deferred to a later chunk (provider registration is admin overhead for the hosted project).
- Onboarding completion is **derived**, not a `profiles` flag: `useOnboardingStatus` checks `>= 1` platform AND `>= 1` pillar (Postgres `count`, `head: true`), cached with a 5-minute `staleTime`. No extra column; the data is the truth.
- Guards: `RequireAuth` wraps every non-public route (public = `/`, `/sign-in`, `/sign-up`); `RequireOnboarded` wraps post-onboarding routes and bounces not-onboarded users to `/onboarding`. The inverse (onboarded user on `/onboarding` → `/dashboard`) lives in `OnboardingPage` (keyed on `step === 1` so the status flip after the pillars step doesn't skip cadence).
- Router: React Router v6 **data router** (`createBrowserRouter`), not `<BrowserRouter>`.
- shadcn primitives introduced this chunk: `button`, `input`, `label`, `form`, `card`, `select`, `checkbox`, `alert`, `separator`, `sonner` — the set needed for the auth forms, the onboarding wizard, and toast feedback.
- Form pattern **doc-locked** (see `03-code-standards.md`, "Form Pattern"): `<Form>` + `zodResolver` + inline `<FormMessage>` + a React Query mutation hook that throws stable `ERROR_CODES` + toast on success/error. The sign-up form is the reference example.
- Onboarding multi-row writes use the single-statement array `insert` (atomic by Postgres semantics) for platforms + pillars, and `upsert` (on `user_id,platform_id`) for cadence targets. No RPC needed (single table each).
- Typed Supabase client (`supabase gen types`) is deferred; `useSavePlatforms` Zod-parses the returned rows so the untyped client stays type-safe at that boundary.
- A UI-input-vs-domain schema rule was added to `03-code-standards.md`: form/step schemas (`auth-schemas.ts`, `onboarding-schemas.ts`) stay feature-local; only persistent-entity schemas live in `@shared/schemas/`.

## 2026-05-29 — Chunk 03 — LOCKED DECISION REVERSED: Tailwind v3 → v4 (human-approved)
- The Chunk 01 lock "Tailwind v3, not v4" was justified by "the shadcn ecosystem still assumes v3." The current shadcn CLI (4.8.2) **targets Tailwind v4** — its `init` emits v4 CSS (`@import "tailwindcss"`, `@theme`, `oklch`, `tw-animate-css`) that does not build under v3. The rationale inverted, so — **with the human's explicit confirmation** — the lock was reversed and the project upgraded to Tailwind v4.
- Migration: `tailwindcss@^4` + `@tailwindcss/vite` (plugin in `vite.config.ts`); removed `tailwind.config.js`, `postcss.config.js`, and `autoprefixer` (v4 handles theming-in-CSS and vendor prefixing). Theme tokens — incl. the status colors and Inter font — are `@theme` entries in `src/index.css`. The status pills (`bg-status-*`) still work.

## 2026-06-02 — Chunk 11 — Anthropic proxy Edge Function (first secret-holding backend)

- **One Edge Function, many tasks, single dispatch.** `anthropic-proxy` dispatches by a `task`
  discriminator validated through `AiTaskRequestSchema` (a Zod discriminated union). A new AI task =
  a new union case + a new handler, NOT a new function. Avoids N near-identical functions and keeps
  the auth/rate-limit/logging plumbing in one place. If the single function exceeds ~500 lines,
  split the handlers into per-task modules (already partly there: `task-handlers.ts`).
- **Model pinned in `_shared/anthropic-config.ts`** (`ANTHROPIC_MODEL = 'claude-sonnet-4-6'`),
  single source of truth, low temperature (0.2) for reliable JSON output. Trade-off: a model change
  is a code deploy — acceptable given the slow upgrade cadence. **Must verify the exact identifier
  against current Anthropic docs before the Chunk 13 hosted deploy** (the value lives in one place
  precisely so a bump is a one-line edit). Could not live-verify here (no API key in the env).
- **Per-user rate limit: 20/min, 200/day**, counted from `ai_request_log`. Minute checked first
  (runaway/abuse guard), day second (cost cap). **Check-then-act with a tiny race window** — a user
  firing 21 requests within ~60ms could slip past; not a realistic vector for an interactive button.
  **Fails open** on a lookup error (don't block real users on infra hiccups). 429 + `RATE_LIMITED` +
  `meta.reset_seconds`.
- **No retries on Anthropic failure; 60s abort timeout; no streaming.** A failed request returns an
  envelope error and the user clicks "try again" — auto-retry could double-charge without consent.
  Streaming + multi-turn + bring-your-own-key are explicitly out of MVP.
- **Output is validated before returning.** The model's text is JSON-extracted (defensive about
  leading/trailing prose) and parsed by the task's output schema; a malformed response becomes
  `AI_RESPONSE_INVALID`, never a passthrough. The client narrows the upstream response to only the
  fields it reads (`content[0].text`, `usage.*`).
- **Errors never leak.** Anthropic timeouts → `AI_TIMEOUT` (504); non-2xx / bad shape →
  `AI_UPSTREAM_ERROR` (500, status logged, body truncated to 500 chars and never returned); missing
  env → `CONFIGURATION_ERROR` (500). All mapped to canonical `ERROR_CODES`.
- **Service role used for exactly two things:** rate-limit reads and `ai_request_log` inserts. The
  log table has a self-select RLS policy and NO client INSERT/UPDATE/DELETE policy → only the
  RLS-bypassing service role writes it; users read only their own rows. Everything else uses the
  user's JWT, validated via `supabase.auth.getUser()` (a forged token fails there — security
  boundary, verified: a no-Authorization request returns 401).
- **`ai_request_log` is observability-only, never user-facing, never stores bodies** — sizes,
  timing, success, error_code only. It doubles as the rate-limit source.
- **Pack markdown goes in the system prompt** (stable per-request context, first), the task-specific
  question in the user message — friendlier to prompt caching later (not enabling cache headers this
  chunk; Anthropic caching has specific requirements, deferred).
- **AI is opt-in by explicit click, gated on brand context.** The "Suggest formats with AI" button on
  the spawn flow is disabled (with a focus-accessible tooltip) until the user has ≥1 brand-context
  file — an uninformed suggestion is worse than none. AI never auto-submits: it pre-fills the spec
  rows (resolving `platform_slug`→id, `pillar_name`→id locally; unresolvable ones drop to null with a
  warn log) and the existing manual "Spawn N items" button is still the only path to a DB write. A
  future `userPreferences.ai_enabled` flag (not built) will allow a global opt-out.
- **Adaptations vs the chunk-11 spec's example code (documented):**
  - `_shared/task-schemas.ts` uses a **bare `zod`** import, NOT `npm:zod@3.23.8`. The whole `_shared`
    folder imports bare `zod` (Deno resolves via `deno.json` → npm:zod@4.4.3; the frontend via
    node_modules), and the frontend imports this very file via `@shared/task-schemas` — an `npm:`
    specifier there would break the frontend build. Zod v4's `discriminatedUnion`/`omit`/`extend` all
    work as used.
  - Added **`HTTP_STATUS.GATEWAY_TIMEOUT = 504`** to both http-status mirrors — the spec used a
    literal `504`, which violates the no-magic-status-number standard.
  - Added **`reset_seconds`** to the shared `ApiMetaSchema` so the rate-limit retry hint survives
    envelope validation on the frontend (Zod objects strip unknown keys, so it had to be declared).
  - The Edge Function returns `okResponse(result)` (the existing helper's `(data, meta?, status?)`
    signature defaults to 200) rather than the spec's `okResponse(result, undefined, HTTP_STATUS.OK)`
    — equivalent.
  - Validation-failure `details` carry a compact `{ issueCount }` rather than the full Zod issue
    array — avoids leaking validator internals to the client while still signalling shape failure.
- **Frontend `ai-client.ts` annotates `await response.json()` as `unknown`** before Zod parsing
  (binding `any` would trip `no-unsafe-assignment`); it never logs request/response bodies — only
  envelope-issue counts and error codes.
- **Backend Deno code is not linted by the frontend ESLint** (`eslint .` runs from `/frontend`,
  outside `../backend`). `_shared/logger.ts` is the only sanctioned `console.*` caller in `/backend`;
  the discipline is enforced by code review. Documented in `03-code-standards.md`.
- **Verification reached every key-free path live** (401, 400 invalid JSON, 400 unknown task, method
  guard, `CONFIGURATION_ERROR`, and `AI_UPSTREAM_ERROR` — which proved the full pipeline by reaching
  Anthropic with a dummy key) plus the `ai_request_log` write and cross-user RLS. The 200 success
  path and `AI_TIMEOUT` require a real `ANTHROPIC_API_KEY` (Chunk 13 deploy verification).

## 2026-06-02 — Chunk 10 — Brand context files & content pack export

- **Pack format is versioned markdown, `v1`.** Header comment `<!-- content-engine-pack v1 / generated YYYY-MM-DD -->` lets future readers (a pack importer, Chunk 11's proxy) detect compatibility. Version bumps only on a breaking format change. The version string lives in `pack-constants.ts::PACK_VERSION`.
- **Fixed section order:** `voice → audience → offers → platform_rules → do_dont → examples → other → (recent examples) → (idea scope)`. Rationale: orient the AI on identity first, commercial context next, mechanics, then concrete examples, then the specific task. Lives as `BRAND_CONTEXT_KIND_ORDER` in `@shared/schemas/brand-context-file.ts`.
- **Fixed kind taxonomy, no user-defined kinds.** Section order is kind-driven; custom kinds would need section-control UI for no clear payoff. `other` is the escape valve.
- **Multiple files of one kind concatenate under one `##` heading**, each as a `###` sub-section titled by the file's title. Empty kinds are omitted entirely (no orphan headings).
- **`pack-builder.ts` is a PURE function.** No fetching, no `Date.now()` — the `generatedDate` is a parameter. Identical inputs → identical output (verified: ran `buildPack` twice on the same input, byte-identical). This is now a documented standard ("Pure Functions Over Fetching Modules" in `03-code-standards.md`), joining `dashboard-aggregations.ts` and `calendar-grouping.ts`.
- **Idea-scoped export embeds the idea + flat relationship summaries.** A `## This idea` section carries title/pillar/notes + a flat list of spawned items + one-line cross-post / repurposing summary strings (e.g. "Course launch — YouTube video → 1 repurposed item"). DELIBERATELY FLAT — no deep nesting — to keep the pack readable. `useIdeaForExport` assembles this in ≤5 thin RLS-scoped queries; under the spec's 150-line threshold, so no server-side `export_idea_context` RPC was built (reserved for Chunk 11 if it needs the same context server-side).
- **No prompt template inside the pack.** The pack is just facts; the user writes their own prompt around it. Preserves product neutrality about how creators work with AI.
- **No markdown rendering in-app.** Bodies edit in `<Textarea>`; read-only/preview views use `<pre className="whitespace-pre-wrap">`. Avoids an XSS surface and a markdown-renderer dependency (`marked`/`react-markdown` explicitly NOT added). The receiving AI tool renders it.
- **Copy-to-clipboard is primary; download `.md` is secondary; preview is verbatim.** The preview Dialog shows the exact string that gets copied — confidence before handoff. Chose `Dialog` over `Sheet` for a centered near-full-screen modal.
- **100,000-char pack cap.** Over it, the tail truncates at a newline boundary with a `<!-- TRUNCATED: … -->` footer; the composer shows a warning. Even maximal context shouldn't blow past LLM windows when pasted alongside a user message.
- **Composer state is NOT persisted** (no `pack_presets` table for MVP). Each visit starts all-files-checked, no idea, no examples. The selection model tracks DESELECTED ids so "all checked by default" needs no effect (lint-safe; mirrors the cross-post dialog trick). If users want presets, localStorage is the follow-up.
- **Brand-context schema kept its Chunk 02 names** (`BRAND_CONTEXT_KIND_VALUES` / `BrandContextKind`), NOT the Chunk 10 spec's `BRAND_CONTEXT_FILE_KIND_VALUES` / `BrandContextFileKind`. Renaming a Chunk 02 export across chunks is a refactor, not this chunk's job. Added `BRAND_CONTEXT_KIND_ORDER` (section order, distinct name from VALUES to document intent) + the create/update input schemas under the existing convention. New code adapts to the real names; deviation documented.
- **`clipboard.ts` uses try/catch, not an availability guard.** The DOM lib types `navigator.clipboard` as always-present (an explicit `!navigator.clipboard` guard trips `no-unnecessary-condition`). At runtime it's undefined in insecure (http) contexts / old browsers, where accessing `.writeText` throws synchronously and the try/catch catches it. Net behavior is identical (false → fallback toast); the only loss is a distinct `clipboard_unavailable` log event (merged into `clipboard_write_failed`). Deviation from the spec's reference code, documented.
- **`/content-items/new` query-param pre-fill** (Chunk 09's `?pillar_id`/`?platform_id`) was NOT duplicated for brand-context; brand-context's `?kind=` pre-fill is its own small parser in `NewBrandContextFilePage`.
- **Idea-detail "Export pack for this idea" button** added to `IdeaDetailPage` (a small Chunk 05 patch). `features/ideas` now imports a hook + component + messages from `features/brand-context` — a cross-feature import that is fine (only Zod schemas are restricted to the `@shared` door; intra-frontend feature imports are allowed).
- **`DeleteBrandContextFileDialog` copy mentions "0 saved export presets"** — a forward-looking placeholder; presets aren't implemented, so the count is always 0 for MVP. Documented placeholder.
- **No new npm dependencies and no backend/schema changes this chunk.** `brand_context_files` already existed (Chunk 02) with the correct RLS (`auth.uid() = user_id`, verified). `Dialog`/`AlertDialog` primitives already existed. Two tiny pure-DOM `lib/` helpers added (`clipboard.ts`, `download.ts`).

## 2026-06-02 — Chunk 09 — Pillar/cadence dashboard

- **Charting library: `recharts`.** Pinned `^3.8.1`. Bundle delta: **+108 kB gzipped** (well under the chunk-09 spec's 300 kB threshold). Alternatives considered: `nivo` (heavier API + larger bundle for the same chart shapes), hand-rolled SVG (would re-implement tooltips, axes, responsive sizing for no business reason). Recharts is in maintenance mode (not abandoned); if it stops shipping fixes we revisit.
- **Sanctioned chart types: `<BarChart>` (vertical, horizontal, stacked) + `<ResponsiveContainer>` only.** Codified in `/context/03-code-standards.md` → "Charting Library". Adding a new chart type (line, area, pie, scatter, radar, treemap, radial-bar, sankey) requires an explicit `decisions.md` entry. Keeps the visual language consistent across the four panels and any future ones.
- **Dashboard window selector: `7d` / `30d` / `90d`, default `30d`.** Longer windows (180d/365d) are out of MVP — would require more data than a fresh user has. URL is single source of truth (`?window=…`); default not serialized (clean URLs). Invalid input falls back silently to `30d`.
- **Pillar balance counts `scheduled + published` items only.** Drafts and ideas aren't on the publishing track; conflating them with output would misrepresent the user's mix. The "No pillar" row pins at the bottom regardless of count so categorized pillars are read first; hidden entirely when there are zero uncategorized items AND the total is non-zero.
- **Pillar balance sort order: count descending, ties broken alphabetically.** Surfaces dominant pillars first; ties stable across renders.
- **Cadence counts `published` items only.** Scheduled is intent, not output. Cadence is about output. A creator with 10 scheduled items for next week sees low cadence — that's correct (they haven't published yet). Documented in the panel's help tooltip.
- **Cadence on-target tolerance: ±15% of the per-week target.** Below → `under`, above → `over`, target=0 → `untracked`. The threshold lives in `dashboard-constants.ts::CADENCE_DELTA_TOLERANCE` so flipping it later is one line. Revisit if user testing shows it's too strict or too loose.
- **Cadence window-normalization: `actual/wk = published_count ÷ (days/7)`.** Math: 4 items in 30 days → `4 ÷ (30/7) ≈ 0.933/wk`. Window choices (7/30/90) are directly comparable.
- **Cadence indicator pills use Tailwind named-color scales** (`emerald`/`amber`/`sky`/`muted`), NOT the `--color-status-*` tokens. These aren't status indicators — they're "are you keeping up" indicators. Reusing `status-published` for "on target" would dilute the status vocabulary. The four classes are centralized in `CADENCE_INDICATOR_CLASSES` in `dashboard-constants.ts`.
- **Status mix counts ALL items created in the window**, grouped by status. Window applied to `created_at`, NOT to `scheduled_for`/`published_at`. The window query may return rows whose `created_at` falls outside the window (because their date columns put them in scope); the aggregation drops those rows explicitly.
- **Top empty cells is fully client-side.** Cross-product of (pillars × active platforms) minus pairs that have ≥1 published item in the window. Typical user has <30 cells; sorting + cap is trivial; a server query would be more code for the same answer.
- **Top empty cells cap = 5 rows.** Above 5 the panel becomes "every gap" rather than "where to focus next" — the value comes from the suggestion, not exhaustiveness. Constant lives in `dashboard-constants.ts::TOP_EMPTY_CELLS_LIMIT`.
- **First-run experience** uses a separate HEAD-count query (`useDashboardHasAnyItems`), 5-min staleTime. Different question than "is the window empty" — a long-time user with 100 items can have a 7-day window with 0 items without triggering first-run.
- **Four panels share ONE windowed query** (`useDashboardWindow`). Trade-off: aggregations run on every dashboard render until React Query caches. Acceptable for an MVP user with <500 items per window; the spec's 500ms perf budget is generous. `useMemo` wraps each aggregation invocation.
- **Window query uses PostgREST 3-clause `or=(and(...),and(...),and(...))`.** Extension of the calendar's 2-clause pattern (Chunk 08). Verified via `curl` against the local stack: all 5 seeded items returned for a 30-day window. Fallback (3 queries + client dedup by `id`) documented if the encoding ever breaks.
- **Chunk 04 form patched (additive)** to accept `?pillar_id=X&platform_id=Y` query params in create mode. Validated via `z.uuid()`; invalid input → silent drop to the default empty selects. Existing edit-mode behavior unchanged. New prop: `ContentItemFormPrefill`. Documented as a Chunk 04 patch.
- **Per-panel loading + empty states; page-level error state.** Each panel renders its own skeleton + empty branch (so an in-flight cadence query doesn't blank out the pillar panel that already loaded). A query failure on ANY of the 4 underlying queries surfaces ONE destructive `<Alert>` at the page top with a "Retry" button that refetches all of them.
- **Cadence rows link to `/content-items?platform=<id>`** (matches Chunk 04's existing filter param `platform`, not the spec's `platform_id` — the existing list filter is the source of truth, not the spec text). The pillar balance and status mix panels do not link out — clicking a bar does nothing (no cross-filtering in MVP).
- **`DashboardPlaceholder.tsx` deleted.** Replaced by `DashboardPage.tsx`. The placeholder's messages file (`dashboard/messages.ts`) was rewritten in place — no stale strings.
- **13th vendored shadcn primitive: `tooltip`.** Used by `PanelCard`'s help-icon. Same radix-nova style as the other 12. No app-level `TooltipProvider` (each panel wraps its own provider with a short delay — keeps the change additive and avoids touching the AppShell).
- **`pg-error-mapping.ts` not touched.** Dashboard errors are simple (load failed → INTERNAL_ERROR, schema mismatch → INVALID_RESPONSE). No RPC tokens to map.

## 2026-06-02 — Chunk 08 — Unified calendar view

- **Native `Date` + `Intl`; no date library.** All calendar math (`getCalendarWindow`, `addDays`, `toLocalDayKey`, weekday names, locale-aware short/long labels) lives in `calendar-date-utils.ts`. Boundary cases (Dec→Jan, 5- vs 6-row months, Sunday-starting February) verified via a Node sanity script. Adding `date-fns` / `dayjs` for one view is overkill. If a future chunk needs richer manipulation (recurring rules, complex business-day math), revisit. **No new top-level dependencies** in this chunk (verified via `git diff frontend/package.json` — empty).
- **Calendar dates are interpreted in the user's LOCAL timezone.** `toLocalDayKey(date)` returns `YYYY-MM-DD` derived from `getFullYear/Month/Date` — NOT `toISOString()` (which would emit UTC and shift items off their local day at certain hours). Documented trade-off: a creator traveling across timezones will see their content shift days; acceptable for MVP.
- **Calendar window query is one round-trip to PostgREST.** Uses the `or=(and(scheduled_for.gte.X,scheduled_for.lt.Y),and(published_at.gte.X,published_at.lt.Y))` syntax with a follow-on `status.in.(…)`. Verified end-to-end via direct `curl` against the local stack: the seeded scheduled YouTube video (b3, scheduled_for=2026-06-09) is returned for a June 2026 window query. **Fallback path documented**: if Supabase JS ever changes the `.or()` encoding and the round-trip breaks, switch to two separate queries + client-side merge by `id`. Don't silently weaken the filter.
- **Status filter defaults to `['scheduled', 'published']`.** Other statuses don't have a renderable date by definition — including them in the filter is allowed but typically returns nothing. The rendering rule (in `calendar-grouping.ts`) drops any row whose status isn't `scheduled`/`published`, even if it somehow returned from the query — defense in depth.
- **`MAX_CHIPS_PER_CELL = 3`.** Above 3, cells become unscannable at the spec's ~120px desktop height. Overflow chips collapse to a "+N more" button that opens a popover with the full list. The popover's chips are the SAME `CalendarChip` component so behavior stays identical (nested popovers: Radix manages stacking).
- **One chip per item, even within a cross-post group.** Each platform variant is a distinct publishing event with its own date. The chip carries a small `Share2Icon + (group_size - 1)` indicator showing it's part of an N-platform cross-post group. Grouping variants into one chip would hide the platform dimension and break date accuracy.
- **Today's cell uses `ring-2 ring-status-scheduled ring-inset`** — the same token as the "scheduled" status. The semantic pairing ("upcoming") fits; using a generic accent would dilute the calendar's color story.
- **Off-month cells use `bg-muted/30 text-muted-foreground/60`** for the day number, with regular `bg-card` for in-month cells. Visually de-emphasized without going invisible — keyboard users can still tab into them.
- **Vendored shadcn `popover` primitive (12th total).** Used by chip popover, overflow popover, and the status multi-select in the header. Same radix-nova style as the other 11.
- **URL is the single source of truth for filter state.** `useCalendarFilters` reads `?month`, `?statuses`, `?platform_id`, `?pillar_id` via `useSearchParams`. Default values are NOT serialized into the URL (so a fresh visit to `/calendar` shows the current month with default statuses and a clean URL). Back/forward + refresh preserve every filter.
- **`?month=YYYY-MM` is bounded** by `MIN_VALID_YEAR=1970` / `MAX_VALID_YEAR=9999`. Out-of-range or malformed input falls back silently to the current local month — URL-hacking benign.
- **Status multi-select uses a Popover-wrapped Checkbox group**, not a Combobox. Showing all 5 statuses inline (with a "Reset to default" button when the user has diverged from `['scheduled','published']`) is faster to operate than a Combobox for such a small option set.
- **Curated `PLATFORM_ABBREVIATIONS` map**, not auto-derived first-two-chars. Auto-derivation would produce ambiguous strings (TikTok + Threads both start "T…"; a future localization could collide further). The map lives feature-local (`messages.ts`) since it's display-only; only canonical metadata goes in `@shared`.
- **Agenda panel is desktop-default, mobile-toggle.** On `lg+` the agenda sits in a 22rem sticky column alongside the grid (the grid spans `1fr`). On smaller screens the grid is primary and the agenda is hidden behind a "Show list" toggle. Decision documented in the spec; we landed on the spec's MVP recommendation.
- **Performance log on every window query.** `logger.debug('calendar_window_query_complete', { rows, elapsedMs, month })`. This is the signal that the Chunk 07 view's lateral joins might need materializing — see `03-code-standards.md`'s "Read-Optimized Views" rule. Persistent spikes (>500ms) trigger the next-chunk action item.
- **The `lib/pg-error-mapping.ts` lib is NOT touched in this chunk.** Calendar errors are simple (load failed → INTERNAL_ERROR, schema mismatch → INVALID_RESPONSE). No RPC tokens to map; no new pattern array.
- **Sidebar Calendar link was already in position 3** (Dashboard → Content items → Calendar → Ideas) from the Chunk 03 nav. Verified; no reorder.

## 2026-06-02 — Chunk 07 — Repurposing chains

- **Repurposing topology is parent-with-many-children, rooted on the long-form source.** Structurally identical to a cross-post group (one parent, N children, no child-to-child edges within the relationship), but semantically distinct: the parent is the canonical *long-form asset* that the children derive from, not a per-platform replica.
- **A content item has AT MOST ONE `repurposed_from` parent.** Enforced by `content_relationships_repurposed_from_child_unique` — a partial unique index on `(user_id, child_id) WHERE relationship_type = 'repurposed_from'`. Mirrors the Chunk 06 cross-post rule. A creator wanting to credit multiple sources picks the primary; the rest go in notes.
- **No cap on lifetime children**, only on per-call spawn (12, same as siblings). One long-form piece can fuel many derivatives across many sessions.
- **The topology is a TREE, not just two levels.** A child of a repurposing chain can itself be a parent of further repurposed items (long-form video → carousel → series of tweets is a valid 3-level chain). The view's `repurposed_children_count` reports immediate children only; UI's `RepurposePanel` adapts its heading when the current item is mid-chain ("In a repurposing chain"). No cycle detection beyond the base `parent_id <> child_id` check — multi-step cycles require deliberate construction and aren't a realistic user workflow. Documented as a known limitation in the progress tracker.
- **Children inherit nothing from cross-post groups.** If the parent is part of a cross-post group, repurposed children do NOT auto-spawn cross-post variants. The creator must explicitly cross-post each child. Rationale: repurposing already introduces N items; layering a 4× platform multiplier would overwhelm.
- **Child status starts at `'idea'`, notes start NULL.** Each derivative is a fresh draft. Title and pillar default from the parent if not provided per-spec; idea_id ALWAYS inherits (the conceptual lineage stays consistent). Format MUST be explicit per spec — the entire point of repurposing is producing different formats. **No content propagation after spawn** (same rule as siblings/cross-posts).
- **Min spec count is 1 for repurposing.** Unlike siblings (which require 2 — "if you only want one, use the standalone form"), repurposing one long-form into one short-form IS a valid lineage to track.
- **Replaced Chunk 06's `content_items_with_cross_post_size` view with `content_items_list_view`.** Carries FIVE per-relationship aggregates: `cross_post_group_size`, `sibling_group_size`, `repurposed_children_count`, `repurposed_from_parent_id`, `repurposed_from_parent_title`. Same `security_invoker = true` posture. The `repurposed_from_parent_title` is **denormalized** at the view layer so the list-row "↑ from: …" line renders without a per-row second lookup. Acceptable trade-off — view recomputes on each query; if list latency degrades visibly, the materialized-view escape hatch is documented in `03-code-standards.md`'s new "Read-Optimized Views" subsection.
- **Reshaped `lib/pg-error-mapping.ts` from tuples to objects.** Chunk 06 used `ReadonlyArray<readonly [token, code]>`; Chunk 07's spec prescribes `ReadonlyArray<{ pattern: string; code: ErrorCode }>`. Functionally equivalent; the object shape is self-documenting at use sites. Dropped the `fallback` option from Chunk 06's version (overengineered — every caller used the default `INTERNAL_ERROR`). Refactored all four RPC callers (status update, sibling spawn, cross-post spawn, repurposing spawn) to call `mapPgError(message, patterns)` directly with their feature-local pattern arrays; removed the intermediate `mapPostgrestError` / `mapPgErrorMessageToErrorCode` wrappers. Behavior unchanged — verified via the regression tests M/N/O in the chunk transcript.
- **`useRepurposeChain` is a 3-thin-query hook** (parent edge → parent item → children edges + items). Acceptable for now; if the data shape grows further (e.g., expanding multiple chain levels in one fetch), promote to a server-side helper. At ~135 lines, still under the spec's 150-line promotion threshold.
- **`REPURPOSE_PG_ERRORS` lives inline in `useSpawnRepurposedChildren.ts`**, not folded into `CONTENT_ITEM_PG_ERRORS` in `errors.ts`. The repurpose tokens overlap with cross-post on `NOT_AUTHENTICATED + NOT_FOUND` only; adding `NO_SPECS/TOO_MANY_SPECS` to the shared list would dilute its specificity. Can revisit if Chunk 09 or later adds another overlapping vocabulary.
- **The list-row "↑ from: …" line** is denormalized via the view's `repurposed_from_parent_title` column. No per-row N+1 lookup; the parent title comes back with the row payload. Visual priority: status badge (most prominent), relationship-count badges (secondary, neutral background), "↑ from" line (tertiary, small muted text below title).

## 2026-06-02 — Chunk 06 — Cross-post grouping

- **Cross-post topology is parent-with-many-children, rooted on the source platform variant.** Structurally identical to a sibling star (one hub, N spokes, no spoke-to-spoke edges), but semantically distinct: the hub IS the source, not just the first item created. Same `parent_id <> child_id` invariant; same `content_relationships` row format with `relationship_type = 'cross_post'`.
- **A content item belongs to AT MOST ONE cross-post group as a child.** Enforced by `content_relationships_cross_post_child_unique` — a partial unique index on `(user_id, child_id) WHERE relationship_type = 'cross_post'`. The source (parent_id) may have arbitrarily many children. Sibling membership is independent (different relationship_type, different partial index — actually the base Chunk 02 uniqueness on the 4-tuple, no extra constraint for siblings).
- **Source must have a platform_id.** Cross-posting a platform-less item is meaningless (the whole point is per-platform tracking). The RPC raises `SOURCE_LACKS_PLATFORM`; the UI hides the "Add cross-post" affordance and shows a "Set a platform on this item to enable cross-posting." tooltip.
- **No content propagation across variants after spawn.** Title/format/notes/idea_id/pillar_id are copied from source to each child at insert time but DO NOT propagate on subsequent edits. Rationale: creators tweak copy per platform; propagation would fight that workflow. Trade-off documented; "Each variant is independent — edit each platform's copy separately." appears in the dialog copy.
- **Child status starts at `'idea'`, not the source's status.** Each platform-specific draft has its own publishing path; starting them at `'idea'` keeps the lifecycle clean. The list/calendar shows their own status independently.
- **Spawn cap is 20 platforms per call.** Generous (creators rarely have more than ~10 active platforms), and matches a "single spawn" UX intent. Validated client-side (Zod `CrossPostSpawnSchema`) AND server-side (RPC) — defense in depth.
- **Generalized `get_content_item_siblings` → `get_content_item_relations(p_item_id, p_relationship_type)`.** Chunk 05's helper was siblings-only. Cross-post needed the same plumbing; rather than ship a parallel `get_content_item_cross_posts`, replace with one parameterized function. Chunk 07's `repurposed_from` will use the same function with a third discriminator. Migration drops the old function; `useContentItemSiblings` was migrated in this chunk to pass `'sibling'` explicitly. This is the one allowed cross-chunk touch per the spec.
- **Read-optimized view `public.content_items_with_cross_post_size`** for the list-row "+N platforms" badge. The alternative (per-row N+1 count queries) would multiply API calls by 25× at default page size. The view uses `with (security_invoker = true)` (Postgres 15+; verified PG 17.6 on local Supabase) so RLS on the underlying tables enforces row scoping as the calling role. **Implementation note: an initial LEFT JOIN LATERAL draft incorrectly returned 1 for items not in any cross-post group** (`count(*)` over an empty set is 0 and `1+0=1`). Replaced with an explicit `CASE … WHEN exists(parent edge) … WHEN exists(child edge) … ELSE 0 END` formulation. SQL test L3 confirms.
- **Extracted `frontend/src/lib/pg-error-mapping.ts`** as the spec-reserved third-caller threshold. Three RPC callers (status update, spawn siblings, spawn cross-posts) now share the include-scan plumbing; each feature owns its own ordered `[token, ERROR_CODES.code]` "vocabulary" array. Tokens that don't match fall through to `INTERNAL_ERROR`. Chunk 07's repurpose RPC will register its own vocabulary entry.
- **Vendored shadcn `dialog` primitive.** Used the official CLI (`npx shadcn@latest add dialog`); same radix-nova style as the other 10 primitives. The existing `alert-dialog` stays for destructive-confirmation flows; the new `dialog` is for generic modals like `AddCrossPostDialog`. Distinct ARIA roles (`dialog` vs `alertdialog`) preserve accessibility semantics.
- **`AddCrossPostDialog` uses a key-driven remount of its body**, not a `useEffect` that resets state. ESLint's `react-hooks/set-state-in-effect` rule rejects `useEffect(() => setState(seed), [seed])`. The remount pattern (`<DialogBody key={bumpKey} ...>`) initializes state from props via `useState(() => seed)` on mount — clean and lint-clean. Same pattern works for any "reset state on dialog open" need.
- **`useCrossPostGroup` is a 3-query frontend hook**, not a server-side helper. The spec set a 150-line threshold for promotion; the hook came in at ~110 lines, so it stays client-side. If a future chunk grows the query shape (e.g., per-platform scheduling stats), reconsider then.
- **`useContentItemsList` now selects from the view** instead of the base table. The view adds `cross_post_group_size`; `ContentItemListRowSchema` (a new `@shared` schema) extends `ContentItemSchema` with that column. The PostgREST FK-join to `ideas` still works through the view.

## 2026-06-02 — Chunk 05 — Ideas + sibling spawning

- **Sibling relationship topology is a STAR, not a complete graph.** When the user spawns N items from an idea, the resulting `content_relationships` rows form a star with the first-created item as the hub (`parent_id`) and the others as spokes (`child_id`). All rows are `relationship_type = 'sibling'`. Rationale: matches Chunk 02's note "the application treats siblings symmetrically when querying"; a star stores N–1 edges instead of the complete graph's N·(N–1)/2 (10 items: 9 rows vs 45). Trade-off: queries must expand transitively at read time; the helper function `public.get_content_item_siblings` hides this behind one RPC call.
- **Hub = first item in spec order.** Deterministic and user-controllable: the order in the spawn form's spec list is the order of insertion. The hub gets a small "Hub" pill in the UI so the user knows.
- **Idea has its own pillar; spawned items inherit it but can drift.** When an item is spawned, its `pillar_id` defaults to the idea's `pillar_id` but can be overridden per-spec or edited later. Chunk 09's pillar dashboard reads from item-level `pillar_id` for accurate balance.
- **Single RPC for spawn: `public.spawn_sibling_content_items(p_idea_id uuid, p_specs jsonb)`.** `p_specs` is `[{ title?, format, platform_id?, pillar_id? }, …]`. Title defaults to the idea's title if omitted per-spec. RPC validates length ∈ [2, 12] and raises distinct exceptions (`TOO_FEW_SPECS`, `TOO_MANY_SPECS`, `NOT_FOUND`, `NOT_AUTHENTICATED`) the frontend maps to error codes. JSONB is explicitly unpacked field-by-field — no whole-payload inserts — to prevent injection of unexpected columns.
- **Spawn cap is 12.** Enforced Zod-side (`SpawnSiblingsSchema`) AND server-side. Prevents accidental floods and matches reasonable creator workflows.
- **Spawn minimum is 2.** A single item should be created via the standalone new-item form (which gains an optional `idea_id` select this chunk). Below 2, the spawn flow's value (creating multiple linked items) doesn't apply.
- **Idea delete preserves spawned items.** Chunk 02 set `content_items.idea_id` to `on delete set null`. Spawned items survive idea deletion with `idea_id = NULL`; their sibling relationships (which reference items, not the idea) persist intact. The delete dialog's copy spells this out explicitly. Rationale: items often outlive the idea that birthed them, especially after publishing.
- **Pre-linking an idea via the standalone new-item form does NOT create sibling relationships.** A content item created with an `idea_id` but no spawn-flow involvement appears with "From idea: …" on its list row but is never returned as a sibling by `get_content_item_siblings`. Documented in the UI; verified via SQL test M.
- **Sibling expansion is server-side via `public.get_content_item_siblings(p_item_id uuid)`.** Returns `setof content_items`. Hides a UNION of two queries behind one RPC and benefits from server-side query planning + a single RLS evaluation. `security invoker` so a cross-user call returns empty.
- **`useIdeaSpawnedItems` returns `{ allItems, stars, loneItems }`, not the spec's flat `ContentItem[]`.** Deviation. The SpawnedItemsList needs star grouping; coalescing the items + edges into one hook (one cache entry under `ideasQueryKeys.spawnedItems(...)`) keeps the spawn-success invalidation atomic. The alternative — two hooks under different keys, both invalidated separately — drifts. Documented; trade-off accepted.
- **`mapPgErrorMessageToErrorCode` lives inline in `features/ideas/errors.ts`.** If a third feature needs the same parsing logic, extract to `lib/pg-error-mapping.ts`. Not extracted preemptively — two implementations (this one + `content-items/errors.ts`'s `mapPostgrestError`) are not yet a pattern, just a coincidence.
- **Content-items list now joins ideas via `select('*, ideas(title)')`.** The PostgREST FK-join returns `{ ideas: { title } | null }` on each row; the hook flattens to `ideaTitle: string | null` on a typed `ContentItemListEntry`. The canonical `ContentItem` shape is unchanged; only the list-query result is extended.
- **No new uniqueness constraint added.** Chunk 02's `unique (user_id, parent_id, child_id, relationship_type)` on `content_relationships` already prevents duplicate sibling edges. The spec's optional safeguard migration was deliberately omitted per the spec's own re-reading instruction.
- **Idea form uses 6-row textarea for notes.** Ideas are typically more verbose than item notes (4 rows). Cosmetic; consistent with the chunk's UI spec.
- **The spawn form's "Cancel" button is labeled "Reset"** — it resets the form to the empty 2-row default rather than navigating away. The idea detail page has its own navigation back to the list; a spawn-only Cancel would be ambiguous.

## 2026-05-29 — Chunk 03 — shadcn 4.x adaptations
- CLI rename: used `shadcn` (the `shadcn-ui` package is deprecated). Style is the current default **"radix-nova"** (not the spec's "default / Slate"); it imports from the `radix-ui` umbrella package, `shadcn/tailwind.css` (custom variants/keyframes), and `tw-animate-css`.
- **radix-nova has no `form` component** (it ships a newer `field` component). Because the form pattern is doc-locked, the canonical react-hook-form-based `form.tsx` was **vendored by hand** (adapted to radix-nova conventions: `Slot.Root`, `data-slot`). The probe `field.tsx` was removed.
- `sonner.tsx` was edited to remove its `next-themes` import (not a Next.js app) and the missing React import; the toaster is hardcoded to the light theme (no dark-mode toggle in MVP).
- Font: the Nova preset's Geist was replaced with **Inter** per `05-ui-context.md` (`@fontsource-variable/geist` uninstalled; Inter declared with a system fallback).
- ESLint: added a `src/components/ui/**` override turning off `react-refresh/only-export-components` (vendored components legitimately co-export variants/hooks); and re-enabled `restrict-template-expressions`'s own default `allowNumber: true` (react-hook-form field-array names require a number in a template, e.g. `targets.${number}.weeklyTarget`).
- **`vite.config.ts` gained a `zod` alias** (`zod` → `frontend/node_modules/zod`). When the rolldown bundler (Vite 8) bundles an `@shared` schema file from outside the project root, it cannot resolve that file's bare `import 'zod'`; the alias forces it to the frontend's copy. This complements the `tsconfig` path (for `tsc`) and the backend `deno.json` import map (for Deno) — the three resolvers that make one bare `zod` import work in all contexts. (Surfaced once onboarding imported `@shared/schemas/platform`.)
- `env.ts`: the new `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` use Zod v4's non-deprecated `z.url()` / `z.string()` validators; both are required (the app fails fast at start if missing). Added the `ONBOARDING` route to `routes.ts`.
- Local-only testing: `frontend/.env` (gitignored) holds the local Supabase URL + anon key; `.env.example` carries placeholders (a real project's creds do not belong in the committed template, even though anon keys are public). Verified end-to-end against the live local API: sign-up creates an `auth.users` row, onboarding writes persist, User B cannot read User A's rows (RLS), and an A→B cross-owner insert is rejected 403.

## 2026-06-02 — Chunk 12 — UI polish, shared feedback primitives, accessibility, mobile

- **New shared folder: `/frontend/src/components/feedback/`.** Houses `EmptyState`, `SkeletonList`,
  `SkeletonCard`, `SkeletonForm`, `ErrorState`, `NetworkErrorState`, `PageHeader`, plus
  `feedback-tokens.ts` for shared dimensions and a `messages.ts` for the primitives' own copy. A
  re-exporting `index.ts` barrel is permitted here (the no-barrel rule applies to `features/`, not
  `components/`).
- **Global error boundary wraps `<Outlet />` inside `<AppShell>`.** `RouteErrorBoundary` catches a
  feature exception, logs via `logger.error('route_error_boundary_caught', { message, stack(≤1000),
  componentStack(≤1000) })`, renders `<ErrorState>` + "Go to dashboard", and remounts the child on
  retry by bumping a `key`. **Trade-off accepted:** form state inside the failing subtree is lost
  on retry. A future chunk could add localStorage drafts.
- **Skeleton-not-spinner.** Loading states render shape-approximating skeletons. The bare
  `FullPageLoader` is permitted ONLY for brief auth-decision route transitions (where no panel
  shape applies). Documented exceptions: chart-shaped panels use a raw `<Skeleton>` block matching
  the chart's footprint (Pillar Balance, Status Mix, Calendar grid) because no shared primitive
  paints a 7×5 grid or a horizontal stacked bar.
- **Empty states have exactly one primary CTA.** The documented exception is the dashboard
  first-run state, which offers `<EmptyState>`'s primary + secondary buttons ("New content item"
  primary, "Capture an idea" secondary). Every other empty state across the app uses a single
  CTA — clearer next-step for the user.
- **Toasts.** Position `bottom-right` on `>=sm`, `bottom-center` on `<sm` (CSS rewrite of
  sonner's container in `index.css`). Durations: `success` 3s, `error` 5s, `info` 3s. Max stacked
  `3`. All dismissable via `closeButton`. The `lib/toast.ts` wrapper is the single import point —
  all feature code routes through it; `sonner` is imported only inside the wrapper + the vendored
  `components/ui/sonner.tsx`.
- **Network-error detection at the React Query / mutation level.** `lib/network-error.ts` exports
  `isNetworkError(error)` matching `TypeError` whose message contains `fetch`, `networkerror`, or
  `load failed` (Chromium / Firefox / Safari phrasings). Feature pages switch between
  `<NetworkErrorState>` (retry) and `<ErrorState>` (mapped code) at the page-level branch. Distinct
  copy: "We can't reach the server right now." vs the mapped message.
- **Focus on route change.** `lib/use-focus-on-route-change.ts` is called inside `<AppShell>`. On
  every `location.pathname` change, requestAnimationFrame defers one tick, queries the first `<h1>`
  inside `<main>`, sets `tabindex="-1"`, and calls `focus({ preventScroll: true })`. Screen reader
  announces the new page heading; sighted users see a focus ring but the viewport doesn't jump.
  Auth pages (sign-in/sign-up) render outside `<AppShell>`, so the hook does not fire there — but
  they still carry an explicit `<h1>` for document outline + screen-reader page identification.
- **Color is never the sole carrier of meaning.** Audited across status badges (color + label),
  cross-post "Missing" pills (dashed border + UPPERCASE "Missing" label), cadence indicators
  (color + label + arrow/check: "On target ✓", "Under target ↓", "Over target ↑"), calendar chips
  (color stripe + aria-label including status name + icon overlays for relationships), and the
  repurposing parent block (icon + "Source" tag). No regressions found in the audit.
- **AppShell mobile hamburger drawer.** A slide-over sheet (`role="dialog"`, `aria-modal="true"`,
  `aria-label="Main navigation"`) opens via a hamburger button on `<md`. Scrim + X both close it;
  NavLink `onClick` also closes it (avoids the React 19 `react-hooks/set-state-in-effect`
  violation that a `useEffect(() => setOpen(false), [pathname])` would trigger). Active nav link
  has a left-border accent (`border-foreground`) in addition to the background tint so color is
  not the sole signal.
- **`<PageHeader>` standardizes the page heading area.** All authenticated pages adopted it (and
  thus all carry exactly one `<h1>`). Breadcrumbs render when supplied; the right-aligned actions
  slot carries "+ New …" buttons or context-specific controls (dashboard's window selector, idea
  detail's "Export pack for this idea", etc.).
- **Bundle size delta is ~5 kB gzipped.** Pre-chunk-12 build was 1.29 MB / 372 kB gz; post is
  1.31 MB / 377 kB gz. Well under the spec's 30 kB ceiling — primitives are composition over
  vendored shadcn pieces; no new dependencies were added.
- **No new npm dependencies.** Every primitive is pure-Tailwind composition over existing shadcn
  + lucide-react icons. Feedback subfolder, RouteErrorBoundary, useFocusOnRouteChange, toast
  wrapper, network-error helper — all hand-rolled inside the existing toolchain.
- **No backend changes.** Polish chunk; backend unchanged.
- **Deviations from chunk-12 spec, documented:**
  - The spec's example `RouteErrorBoundary` returned an `<ErrorState>` directly without a "Go to
    dashboard" affordance. We wrapped the `<ErrorState>` in a max-width container and appended a
    ghost-variant "Go to dashboard" link — matches the spec's decisions section that mentions
    both buttons.
  - The spec's example sonner config used `position="bottom-right"` with a comment that mobile
    bottom-center is implemented via CSS or a wrapping conditional. We chose CSS in
    `src/index.css` (`[data-sonner-toaster][data-x-position='right']` rewritten on `<640px`)
    over a React-side breakpoint listener — simpler, framework-agnostic, no resize observer
    overhead.
  - `lib/network-error.ts` includes Safari's "Load failed" phrasing in addition to Chromium and
    Firefox patterns — the spec's pattern was only `fetch`, but the cross-browser audit found
    Safari uses a phrasing without "fetch". Documented broader match.
  - Auth pages (`SignInPage`, `SignUpPage`) DO NOT use the shared `<PageHeader>`. Reason: they
    use the `<Card>` layout pattern (centered card on a blank page) which would clash with the
    page-header layout. Instead, they have an inline `<h1 class="text-2xl font-semibold">`
    inside `<CardHeader>` — semantic h1, matches `<PageHeader>`'s typography, retains the card
    aesthetic. Documented as a one-off exception.
  - `CrossPostGroupPanel`'s skeleton remains a small inline grid (3 skeleton blocks in a
    grid-cols-1/sm:grid-cols-2/lg:grid-cols-3) because the shared `SkeletonList` is a vertical
    flex column and would collapse the grid layout. Documented exception in the file's comment.
  - `CalendarPage`'s `GridSkeleton` (7×5 grid) is similarly inline — no shared primitive paints
    that shape. Documented in the file's comment.
- **`messages.ts` updated for cadence pill labels** — appended glyphs to the state labels ("On
  target ✓", "Under target ↓", "Over target ↑") so color is not the sole signal. The cadence
  indicator pill renders the label including the glyph; screen readers announce it.
- **`/context/chunk-12-audit-notes.md` is committed as a record of what was reviewed.** The file
  enumerates rough edges by screen with concrete polish items — 20+ items, comfortably above the
  spec's 10-item floor.

## 2026-06-02 — Chunk 13 — Deployment pipeline (Vercel + Supabase CLI)

- **Frontend host: Vercel.** Best-in-class DX for Vite SPAs, free tier covers MVP load, PR previews
  out of the box, simple env-var management, and config-as-code via `vercel.json`. Alternative
  considered: Netlify — equivalent capabilities but slightly more friction for monorepo-style
  root-directory selection. Documented.
- **Branch deploy model: `main` → production; every PR → preview.** No staging environment.
  Rationale: solo creator product; the value of a staging tier is low; PR previews give pre-merge
  verification. If a staging environment becomes warranted (usage growth, contributors), add via a
  `staging` branch protected with required reviews + a staging Supabase project. Documented.
- **Backend deployments are manual via `backend/scripts/deploy.sh`.** Schema migrations are
  dangerous; an automated `git push → db push` to production is too easy to misfire. The script
  asks for explicit `y/N` confirmation before each step. **Deliberate friction**, not an oversight.
  Documented.
- **Edge Functions deploy together with migrations, migrations first.** The proxy depends on the
  `ai_request_log` table; a function-first deploy would 500 on every request. `deploy.sh` enforces
  the order. Documented.
- **No automated rollback.** Rollback is rare and consequential; a documented manual procedure is
  safer than an automated one that might roll back partial data. The runbook covers both sides:
  frontend (Vercel UI "Promote to Production") and backend (`git checkout <sha> && supabase
  functions deploy …` for the function; forward-fix migrations for schema). Documented.
- **Migrations are forward-only.** No "down" migration. Recovery from a bad migration is a NEW
  migration that fixes the problem; data-loss situations use Supabase's point-in-time recovery
  (Project → Database → Backups). Tested locally with `supabase db reset` BEFORE pushing —
  a `db reset` failure means `db push` will fail too, and in production a mid-migration failure
  can leave the DB in a partial state. Documented.
- **Secrets management:** Vercel env vars for frontend; `supabase secrets set` for backend. Neither
  is committed. The repo's `.env.example` files document the variable names only — no real values,
  not even ones that "look like" placeholders that could be mistaken for keys. Rule: any new env
  variable lands in the corresponding `.env.example` in the same PR. Documented.
- **Build configuration in `frontend/vercel.json`, not in the Vercel UI.** Config-as-code: switching
  Vercel projects or reviewing build settings happens in the repo. The UI is a fallback for one-off
  overrides — but every override is a deviation from the source of truth and should be reversed
  ASAP. Documented.
- **`vercel.json` lives at `/frontend/vercel.json`, not the repo root.** Vercel's "Root Directory"
  setting points at `frontend`; the `vercel.json` describes only the frontend build. Putting it at
  the root + a `cd frontend && ...` build command would work but introduces noise. Documented.
- **Smoke test script (`scripts/smoke-test.sh`) is invoked manually after each deploy.** 5
  HTTP checks: frontend index 200, SPA fallback 200 on `/dashboard`, Supabase REST reachable, Edge
  Function rejects unauthenticated requests with 401 (proves function is up AND `verify_jwt = true`
  is in effect), anon key hits PostgREST. **No mutations, no PII.** Documented.
- **Deployment runbook lives in `/context/13-deployment-runbook.md`.** Deployment is a recurring
  operational concern; documentation belongs with the rest of the architecture/standards docs, not
  buried in a feature spec. Documented.
- **Anthropic API key is provisioned separately for production.** Separate billing + separate
  rate-limit accounting at the Anthropic level. Manual step in the Anthropic console; the runbook
  flags it. Documented.
- **Custom domain setup is deferred.** Launch on the default Vercel URL
  (`contentengine-prod.vercel.app`). Custom domain is a 5-minute task once a domain is purchased.
  Not gating launch. Documented.
- **PR previews share the production Supabase.** Trade-off: a PR preview that exercises a mutation
  writes to the production DB. Mitigation: PR authors use throwaway emails when exercising flows on
  previews; if a PR creates persistent test data, audit and delete in the production DB. If usage
  grows, introduce a staging Supabase. Documented.
- **CI runs typecheck + lint + build only.** No tests by design (no test runner installed — chunk
  00). No deploy step — Vercel handles frontend; backend deploys are manual. Placeholder VITE_*
  env vars are passed to the build step so the Zod env validator in `env.ts` passes; real values
  come from Vercel at actual deploy time. The CI build verifies compilation, not deployability
  against a real Supabase. If the placeholder-build masks a runtime config issue (env validation
  fires at app boot, not at build), surface in the chunk-14 audit and consider build-time env
  validation in a future chunk. Documented as a known limit.
- **No application code changes in this chunk.** Pure config + scripts + documentation. The
  frontend `vercel.json` is build config; CI is repo config; the deploy script and smoke test are
  ops tooling. Build, lint, typecheck all unchanged from chunk-12's outputs.
- **Operator-side acceptance criteria documented separately.** This chunk's deliverables that
  require account access (Vercel project creation, Supabase link + `db push`, secrets set, smoke
  run against live URLs, rollback verification, prod Anthropic key provisioning) are flagged in
  the chunk's final report as operator tasks, not committed-code deliverables. The
  configuration-side deliverables are all in repo and pass syntax checks. Operator runs the live
  deploy following `/context/13-deployment-runbook.md`.

## 2026-06-03 — Chunk 14 — Pre-launch audit (static)

- **REST exception for `anthropic-proxy` ratified.** Code review Item 13 ("REST standards for
  Edge Functions") is satisfied via deliberate variance: the single dispatch endpoint uses a
  Zod discriminated-union `task` schema instead of multiple per-task endpoints. Rationale (from
  chunk-11 decisions, now formalized as the launch-ready posture): one function = one
  auth/rate-limit/logging plumbing graph; adding a new AI task = adding a union case + a
  handler case, not a new deploy. The convention for future Edge Functions that ARE CRUD
  resources (e.g. a hypothetical `/functions/v1/exports`) remains plural-noun + method-as-verb.
- **No test runner in MVP — documented gap, not a blocker.** Justification: the chunked
  development workflow verified each chunk manually with structured checklists; the
  architectural patterns (Zod validation, RLS, envelope errors, state machines, RPC atomicity)
  constrain bugs to a small surface; the cost of bolting a test runner onto an already-shipping
  product is non-trivial and best done in a dedicated post-launch chunk ("tests-1"). The
  recommended starting points are pure-function units (`pack-builder.ts`,
  `dashboard-aggregations.ts`, `calendar-grouping.ts`, `calendar-date-utils.ts`,
  `network-error.ts`) + Playwright on highest-risk journeys (sibling-spawn atomicity, status
  transition state machine, AI proxy validation, cross-user RLS).
- **PII boundary made explicit.** PII in this codebase = user emails, brand context bodies,
  idea notes, content item titles + notes, AI request bodies, AI response text. Non-PII = IDs
  (UUIDs), timestamps, counts, status enum values, error code strings, HTTP status numbers,
  sizes. The audit verified that PII NEVER appears in: frontend logger payloads, backend logger
  payloads, `ai_request_log` rows, Edge Function error response messages returned to clients.
  This is the canonical boundary; any future feature must respect it.
- **`handle_new_user` is the only `security definer` function — sanctioned exception.** It's a
  trigger on `auth.users` that creates the `profiles` row at signup, before the user has a
  session. `security definer` is required to bypass RLS on the system-time insert.
  `set search_path = public` defends against search-path-based privilege escalation. The
  function does one thing only (insert one row by id) and cannot be abused to read other rows.
  Standard Supabase pattern; ratified as the SOLE permitted `security definer` function in this
  codebase.
- **One `eslint-disable-next-line no-console` in `frontend/src/constants/env.ts:16` is the SOLE
  permitted exception** to the no-`console.*`-outside-the-logger rule. At module load time the
  logger isn't initialized yet AND a missing env var means the app cannot start, so we emit
  one console.error and throw. The exception is documented with a comment on the preceding
  line; any other use of `console.*` requires a new explicit decision entry.
- **All 15 code review items verified PASS or EXCEPTION** as of 2026-06-03. The audit document
  (`/context/14-pre-launch-audit.md`) is the permanent artifact; future contributors reference
  it instead of re-deriving the answers from code.
- **Engineering-side launch ready; operator gate is the last step.** The audit's
  OPERATOR_RUN_PENDING items (production SQL, cross-user RLS, live rate-limit, production
  smoke, manual E2E, perf measurements) are not engineering tasks — they're the operator's
  pre-launch verification against the actually-deployed environment. The audit's "Launch
  ready" line flips to YES when those items return clean.
- **Known Issues for the post-launch backlog (catalogued in the audit doc):** bundle/recharts
  code-splitting; OnboardingPage inverse-redirect race; sidebar nav links to unimplemented
  routes (Pillars/Cadence/Settings); multi-step relationship cycle prevention; defensive note
  on `ai_unhandled_error` logging boundary; absent test runner; absent automated monitoring;
  absent custom domain; absent staging environment. None block launch.
- **No application code or schema changes were made in Chunk 14.** Audit-only.
