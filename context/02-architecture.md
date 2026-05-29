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
