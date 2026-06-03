# Architecture

## System Overview

ContentEngine is a **single-page application talking to Supabase**. There are two deployable
buildings with one owner: a React SPA, and a Supabase project (Postgres database + Auth + Storage +
Edge Functions). The owner is the creator's authenticated session, which threads through both.

In technical terms:

- The **SPA talks directly to Postgres** (through the Supabase client) for all non-secret reads and
  writes. Row-Level Security (RLS) — not the application server — is the authorization boundary.
- The SPA calls an **Edge Function only when a secret is required** (e.g., proxying the Anthropic
  API, which holds a key the browser must never see) or when server-side orchestration is otherwise
  unavoidable.

There is deliberately **no general-purpose application server** in the middle. Most CRUD is direct
SPA → Postgres, governed by RLS. This keeps the backend surface area small. The cost of that choice
— that validation cannot live only on a trusted server — is paid by running **Zod on both sides**
(see `03-code-standards.md`, "Validation Standards").

## Database Model

This section lists every entity and its relationships at a high level. **No SQL lives here** —
Chunk 02 owns the migrations in `/backend/supabase/migrations/`. This is the conceptual model the
migrations must implement.

- **`users`** — managed by Supabase Auth. The identity anchor. Every user-owned row carries a
  `user_id` foreign key back to the authenticated user.
- **`platforms`** — per-user enabled platforms (YouTube, Instagram, LinkedIn, X, newsletter, …)
  with display configuration (label, color, icon, sort order). A user enables only the platforms
  they use.
- **`content_pillars`** — per-user themes. Content items and ideas are tagged against pillars so the
  creator can see pillar balance.
- **`cadence_targets`** — per-user, per-platform target counts (e.g., "3 LinkedIn posts/week"). Used
  by the cadence-tracking views to compute "am I on pace."
- **`ideas`** — the parent concept that spawns sibling content. An idea is captured once and can
  fan out into many content items.
- **`content_items`** — the lifecycle entity. Each post, video, reel, thread, or newsletter section
  is one content item with a status in `Idea → Drafting → Ready → Scheduled → Published`, an owning
  platform, an optional pillar, and an optional `scheduled_for` timestamp.
- **`content_relationships`** — the join table that connects content items to each other (and items
  to ideas where relevant). Carries a `relationship_type` enum with exactly three values:
  - `sibling` — same idea, different native formats (relationship type B).
  - `cross_post` — same asset, multiple platforms (relationship type A).
  - `repurposed_from` — repurposed children pointing at a long-form parent (relationship type C).

  See `01-project-overview.md`, "Three Relationship Types," for the product framing of these values.
- **`brand_context_files`** — the user's reusable brand-context content: voice, audience, offer,
  platform rules, and examples. Text only in MVP. These are the source material for the exportable
  brand context pack.

Relationship shape, in words: a `user` owns many `platforms`, `content_pillars`, `cadence_targets`,
`ideas`, `content_items`, and `brand_context_files`. An `idea` relates to many `content_items`. A
`content_item` belongs to one `platform` and optionally one `content_pillar`. Two `content_items`
(or an item and an idea) are connected through `content_relationships`, typed by
`relationship_type`.

## API Model

- **Direct Supabase queries for CRUD.** Reads and writes for the entities above go straight from the
  SPA to Postgres through the Supabase client, constrained by RLS.
- **Edge Functions only for:** the Anthropic proxy (Chunk 11), and any future secret-holding or
  multi-step orchestration that arises. Edge Functions are the exception, not the default.
- **One envelope everywhere.** Every Edge Function returns the standard API response envelope
  defined in `03-code-standards.md` ("API Response Envelope"). Every direct Supabase query is wrapped
  by a thin frontend client that **coerces the raw DB response into the same envelope**, so callers
  see one shape whether the data came from Postgres directly or from an Edge Function.

## Auth Rules

- **Supabase Auth** is the identity system. Supported methods: **email/password** and **OAuth
  (Google at minimum)**.
- **Session storage** uses the Supabase client default (localStorage). No custom session handling in
  MVP.
- **RLS is mandatory and universal.** Every user-owned table carries a `user_id` column, and every
  such table has RLS policies of the form `auth.uid() = user_id` for select/insert/update/delete.
  **No row escapes RLS.** A table without RLS policies is a bug, not a shortcut.

## Storage Rules

- **Supabase Storage** is reserved for user-uploaded media in the future. **There is no media upload
  in MVP** — brand context files are text, stored in Postgres, not in a bucket.
- **Bucket-naming convention (for later):** `user-<scope>-<purpose>` (e.g., `user-media-thumbnails`).
  Documented now so later chunks inherit a convention rather than inventing one.

## Security Boundaries

- The **anon key** ships in the frontend. It is public by design; RLS is what protects data, not
  key secrecy.
- The **service role key never leaves an Edge Function.** It is never bundled into the SPA, never
  logged, never returned in a response.
- **RLS is the authorization perimeter.** Authorization is enforced at the database row, so a
  compromised or buggy client cannot read another user's rows.
- **No frontend code may assume server-side validation has happened.** Because most writes are direct
  to Postgres with no server in between, the same Zod schema runs on the client before the write and
  (for Edge Function paths) on the server too. See `03-code-standards.md`.

## Performance Rules

These are the rules; concrete indexes and query shapes belong to Chunk 02.

- **List views are paginated** with cursor-based pagination keyed on `updated_at`. No unbounded
  `select *` over a user's entire history.
- **Counts use Postgres `count`**, not client-side `.length` over a fetched array.
- **Calendar queries are indexed** on `(user_id, scheduled_for)`.
- **Relationship lookups are indexed** on `(user_id, parent_id)` and `(user_id, child_id)` so that
  "show me the children of this parent" and "show me the parent of this child" are both fast.

## The Two-Deploy Model

The frontend and backend deploy **independently**:

- **Frontend:** builds to `frontend/dist` and deploys to Vercel or Netlify with `frontend` as the
  project root directory.
- **Backend:** deploys via the Supabase CLI — `supabase functions deploy` for Edge Functions and
  `supabase db push` for schema migrations.

Either side can ship without the other, **with care**: a schema change that the frontend depends on
must land first, and a frontend feature that depends on a new Edge Function must wait for that
function to deploy. The coupling is the shared Zod schemas (see `03-code-standards.md`,
"Validation Standards") and the API envelope — keep those compatible and the two deploys stay
independent.

**Realized deployment — Chunk 13:** Frontend is on **Vercel** (`main` → production; PRs → preview
URLs). Build config lives in `frontend/vercel.json` (config-as-code, not the Vercel UI). Backend is
on a hosted Supabase project, deployed via the Supabase CLI from a dev machine using
`backend/scripts/deploy.sh` — manual on purpose, with `y/N` confirmation before each step, to keep
schema migrations from firing on every push. Secrets are in Vercel env vars (frontend) and
`supabase secrets set` (backend Edge Function); none ship in the repo. CI
(`.github/workflows/ci.yml`) runs typecheck + lint + build on PR/push and does NOT deploy. The two
deploys are independent; either can roll back without the other (frontend via Vercel UI's "Promote
to Production"; backend Edge Function via `git checkout <sha> && supabase functions deploy …`;
migrations are forward-only — recovery is a NEW fix-up migration, not a "down"). PR previews and
production share one Supabase project — no staging tier in MVP. See
`/context/13-deployment-runbook.md` for the operational details (setup, per-release flow, smoke
test, rollback, env matrix, secrets management).

## Realized Schema — Chunk 02

The conceptual model above is now implemented as Postgres migrations in
`/backend/supabase/migrations/` (timestamped `20260527183908`–`20260527183916`). One line per table:

- `profiles` (`…183909_create_profiles.sql`) — one row per `auth.users` id, auto-created by the
  `on_auth_user_created` trigger; holds `display_name`. RLS: self select + self update.
- `platforms` (`…183910`) — per-user enabled platforms; `slug` check-list of 9 platforms;
  `unique (user_id, slug)`.
- `content_pillars` (`…183911`) — per-user themes; `name` 1–100, `unique (user_id, name)`,
  `sort_order`.
- `cadence_targets` (`…183912`) — per-user, per-platform `weekly_target` 0–200;
  `unique (user_id, platform_id)`.
- `ideas` (`…183913`) — parent concept; `title` 1–300, optional `notes`, optional `pillar_id`.
- `content_items` (`…183914`) — the lifecycle entity; `format` (9-value check), `status` (5-value
  check), optional `idea_id`/`platform_id`/`pillar_id`, `scheduled_for`/`published_at`, with DB
  transition guards (scheduled ⇒ `scheduled_for`; published ⇒ `published_at`).
- `content_relationships` (`…183915`) — the single join table; `relationship_type`
  (`sibling | cross_post | repurposed_from`); `check (parent_id <> child_id)`;
  `unique (user_id, parent_id, child_id, relationship_type)`.
- `brand_context_files` (`…183916`) — reusable brand context; `kind` (7-value check), `title`
  1–200, `body` ≤20000.

Every user-owned table has RLS enabled with an `auth.uid() = user_id` "for all" policy (profiles
uses `auth.uid() = id` split into select + update). `updated_at` is maintained by the shared
`set_updated_at()` trigger (`…183908`). Composite `(user_id, …)` indices back the calendar,
relationship, pillar/platform, and recency read patterns. The canonical Zod mirror of these tables
lives in `/backend/supabase/functions/_shared/schemas/`, imported by the frontend via `@shared`.

## Relationship Topologies

`content_relationships` carries a `relationship_type` discriminator (`sibling | cross_post |
repurposed_from`). Each type encodes a different **topology** in the join table — the same row
shape, three different read patterns. Documenting them in one place keeps Chunks 06 and 07
inheriting decisions rather than reinventing them.

### Sibling — a star (Chunk 05)

When one idea spawns N native-format content items in a single call, the result is a **star**: the
first-created item is the **hub**; every other item is a **spoke**; each spoke is connected to the
hub via one `(parent_id = hub, child_id = spoke, relationship_type = 'sibling')` row. There are
exactly N–1 rows for N items.

```
                spoke₁
                  |
        spoke₂ — HUB — spoke₃
                  |
                spoke₄
```

Why a star and not a complete graph: a complete graph would store N·(N–1)/2 edges (10 items → 45
rows) where the star stores N–1 (10 items → 9 rows). The application "treats siblings symmetrically
when querying" (see Chunk 02), so a query starting at a spoke expands transitively: find every hub
the spoke belongs to (via `child_id = me`), then list every other spoke of those hubs. The
relationship-expansion helper performs this server-side under RLS — see "Relation expansion helper"
below.

Trade-off: queries must run two SELECTs UNIONed rather than one. The helper function hides this
from callers and benefits from server-side query planning + a single RLS evaluation. Acceptable.

### Cross-post group — a parent-with-many-children (Chunk 06)

When one source content item gets cross-posted to N other platforms, the resulting topology is
**one source (hub) with N child variants**. Every cross-post edge points from the source's id to
a child's id with `relationship_type = 'cross_post'`. Structurally this is the same shape as a
sibling star — but the semantics differ: the cross-post hub is the **canonical/source variant**
(the asset that already exists, that everything else is a replica of), while a sibling hub is just
the first spawned item.

```
       source (hub, has platform)
       /   |    |    \
   child  child  child  child
   (IG)    (LI)  (X)   (Newsletter)
```

Key invariants:

- The source has a `platform_id` set. Cross-posting onto a platform-less source is rejected at the
  RPC layer (`SOURCE_LACKS_PLATFORM`) — the entire point is per-platform tracking.
- A content item can belong to **at most one cross-post group as a child**. A source can have many
  children; a child cannot be re-claimed by a second group. Enforced by the partial unique index
  `content_relationships_cross_post_child_unique on (user_id, child_id) where relationship_type = 'cross_post'`.
- Item content (title, format, notes, idea_id, pillar_id) is copied from source to child at
  spawn time but does **NOT** propagate after. Each variant is independent — creators tweak copy
  per platform (longer caption on IG, shorter on X). Status starts at `'idea'` on every child.
- Cross-post and sibling relationships are independent: an item can be both a sibling-of-X and a
  cross-post-of-Y. The partial unique index applies only to `cross_post` rows.

The **size** of a cross-post group (used by the list-row "+N platforms" badge) is read from the
unified list view (see "Read-optimized list view" below).

### Repurposing chain — a tree (Chunk 07)

When a long-form parent (a YouTube video, a newsletter essay) gets broken down into shorter
derivative children (shorts, threads, carousels), the resulting topology is **one parent with N
children** — structurally the same shape as cross-post, semantically different. The parent is the
long-form source, not a per-platform replica.

```
        Long-form parent
           /   |    \
       reel  thread  carousel
        / \
   short  quote   (← grandchildren: chains are TREES, not two levels)
```

Key invariants:

- A child has **at most one** `repurposed_from` parent. Enforced by
  `content_relationships_repurposed_from_child_unique on (user_id, child_id) where
  relationship_type = 'repurposed_from'`. A creator can credit one primary source per child; a
  second source belongs in notes.
- A parent has **no cap** on children across its lifetime. The RPC caps per-call spawns at 12
  (same as siblings).
- The topology is a **tree**, not just two levels: a child can itself be a parent of further
  derivatives. E.g., long-form video → carousel → series of tweets. Each level is one
  `repurposed_from` edge; the view's `repurposed_children_count` reports immediate children only.
- **No multi-step cycle detection.** The base `parent_id <> child_id` check (Chunk 02) blocks
  self-loops. Multi-step cycles (A → B → C → A) would require deliberate effort and aren't a
  realistic user workflow; if it ever becomes a problem, add a recursive-CTE check in a future
  chunk.
- Content (title, idea_id, pillar_id) is copied from parent to child at spawn time; notes start
  NULL on every child (parent notes typically don't apply to a derivative). **No propagation**
  after spawn — each child is independent.
- Repurposing relationships compose freely with siblings AND cross-posts: a derivative reel can
  itself spawn a cross-post group across platforms, and an item can be both a sibling-of-X and a
  repurposed-from-Y.

### Read-optimized list view

`public.content_items_list_view` (security_invoker = true) augments each `content_items` row with
five per-relationship aggregates the content-items list page consumes without N+1 queries:

| Column | Semantics |
|---|---|
| `cross_post_group_size` | Full group size (source + children); 0 if not in any cross-post group. |
| `sibling_group_size` | Full sibling-star size (hub + spokes); 0 if not in any sibling star. |
| `repurposed_children_count` | Number of items where THIS row is the `repurposed_from` parent; 0 otherwise. |
| `repurposed_from_parent_id` | UUID of this row's `repurposed_from` parent if it has one, else null. |
| `repurposed_from_parent_title` | Denormalized parent title for the "↑ from: …" list-row line, else null. |

The view replaces Chunk 06's `content_items_with_cross_post_size`. Same `security_invoker = true`
RLS posture — a caller sees only their own rows + their own relationships + their own parent. If
list-page latency degrades visibly at scale, the next optimization is a materialized view
refreshed via triggers on `content_relationships`; that's a separate chunk.

### Relation expansion helper

`public.get_content_item_relations(p_item_id uuid, p_relationship_type text)` returns every item
connected to the input via the given relationship — handles both the hub-as-input and
spoke-as-input cases via a UNION of forward and reverse lookups (the input id is dropped from the
result). The function is `security invoker`; RLS scopes the result to the caller.

Originally shipped as `public.get_content_item_siblings(p_item_id uuid)` in Chunk 05. **Chunk 06
generalized it to take a relationship_type parameter** so the same plumbing serves siblings AND
cross-posts (and, in Chunk 07, repurposed_from). The Chunk 05 frontend caller
(`useContentItemSiblings`) was migrated to pass `'sibling'` explicitly.

### Atomic multi-row writes

When a single user action must create multiple rows across two tables — for example, the spawn
flow inserts into `content_items` AND `content_relationships` — the write goes through a Postgres
function called via `supabase.rpc(...)`. The function opens an implicit transaction; any raised
exception rolls back the entire block. The function is `security invoker` so RLS applies to the
caller. Reference implementations: `public.update_content_item_status` (Chunk 04),
`public.spawn_sibling_content_items` (Chunk 05), `public.spawn_cross_post_variants`
(Chunk 06), and `public.spawn_repurposed_children` (Chunk 07). All three relationship-spawning
RPCs (siblings, cross-posts, repurposed) follow the identical shape: validate inputs, loop
inserting items + relationship edges, return `setof content_items` for the canonical Zod parse.

## Brand context export pack format

The brand context export pack (Chunk 10) is a **versioned markdown document** (`v1` at time of
writing) assembled entirely **client-side** by a pure function (`pack-builder.ts`) — nothing leaves
the user's machine through ContentEngine's servers. It is the canonical context artifact a creator
pastes into their own AI tool (Claude, ChatGPT, Cursor), and Chunk 11's Anthropic proxy ingests
packs of this same shape.

Structure, in fixed order:

1. **Header comment** — `<!-- content-engine-pack v1 / generated YYYY-MM-DD -->`. The version string
   lets a future reader (a pack importer, the Chunk 11 proxy) detect compatibility. Bumped only on a
   breaking format change.
2. **Brand context sections**, one `##` heading per non-empty kind, in the order
   `voice → audience → offers → platform_rules → do_dont → examples → other`. Multiple files of the
   same kind are concatenated under the one heading, each as a `###` sub-section titled by the file's
   title. Empty kinds are omitted entirely (no orphan headings).
3. **Optional `## Recent published examples`** — published items grouped by platform, when the user
   opts in.
4. **Optional `## This idea`** — when scoped to an idea: title, pillar, notes, a flat list of spawned
   items, and flat one-line summaries of any cross-post groups / repurposing chains. The summaries
   are deliberately flat (no deep nesting) to keep the pack readable.

The pack is capped at 100,000 characters; over that, the tail is truncated at a newline boundary and
a `<!-- TRUNCATED: … -->` footer is appended. The pack is **never rendered as HTML** inside the app —
the preview shows it verbatim in a `<pre>` block; the receiving AI tool does the rendering. Future
versions may add sections; the header version string is how readers detect what they're parsing.

## AI proxy architecture

AI-augmented features call Anthropic through a single Edge Function (`anthropic-proxy`) — the first
secret-holding backend (Chunk 11). It proves out the "two buildings" framing: the SPA talks
directly to Postgres for everything non-secret, and an Edge Function appears only where a secret is
required. Here the secret is `ANTHROPIC_API_KEY`, which **never** reaches the browser.

Request lifecycle:

1. **Authenticate** — the function reads the user's JWT from `Authorization: Bearer …` and validates
   it via `supabase.auth.getUser()` (server-side signature + expiry check; a forged token fails
   here). Unauthenticated → 401 `NOT_AUTHENTICATED`.
2. **Rate limit** — before any Anthropic call, count the caller's `ai_request_log` rows in the
   trailing minute (20) and day (200). Over → 429 `RATE_LIMITED` with `meta.reset_seconds`. The
   lookup fails open on infra error (don't block real users on a hiccup).
3. **Validate** — the body is parsed by `AiTaskRequestSchema`, a **discriminated union over
   `task`**. Each task owns its input schema; an unknown task fails at the parse layer (400
   `VALIDATION_FAILED`), never an if/else.
4. **Dispatch** — `handleAiTask` switches on the task discriminator. The task handler builds the
   system prompt (stable per-request context — the brand pack — goes here, first) and the user
   message, calls Anthropic via `callAnthropic` (60s abort timeout), then **validates the model's
   output** with the task's output schema. A malformed model response becomes `AI_RESPONSE_INVALID`
   rather than leaking to the client.
5. **Log + envelope** — every request (success or failure) inserts one `ai_request_log` row
   (user_id, task, request/response sizes, success, error_code, latency_ms — **never bodies**) and
   returns the canonical `{ success, data | error, meta? }` envelope.

Error mapping is total: Anthropic timeouts → `AI_TIMEOUT` (504); non-2xx / unexpected shape →
`AI_UPSTREAM_ERROR` (500, status logged but the upstream body never returned); missing env →
`CONFIGURATION_ERROR` (500). The proxy never reflects Anthropic's raw error text to the client.

The function holds the **service role key** in env and uses it for exactly two operations:
rate-limit lookups and `ai_request_log` inserts (RLS has no client INSERT policy on that table, so
the log is write-only-by-service-role, read-own-by-user). Every other concern uses the user's JWT.

The pinned model + tunables live in `_shared/anthropic-config.ts` (single source of truth). The
brand-context pack (Chunk 10) is the canonical context shape sent to the model. **AI is opt-in by
explicit user click — never auto-triggered**; a future `userPreferences.ai_enabled` flag will allow
disabling AI features entirely. The frontend's only AI feature in MVP is the sibling-spec
suggestion on the spawn flow; the user always reviews + edits before any DB write.
