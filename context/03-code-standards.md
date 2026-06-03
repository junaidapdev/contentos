# Code Standards

These standards are binding for every chunk. They encode the constraints from the code review that
preceded this project; each section notes the review item it enforces. When a chunk's spec and these
standards conflict, stop and ask (see `04-ai-workflow-rules.md`).

## TypeScript Standards

- **Strict mode on.** `strict: true`, plus `noImplicitAny: true`, `strictNullChecks: true`,
  `noUncheckedIndexedAccess: true`, and `exactOptionalPropertyTypes: true`. (Chunk 01 wires the
  actual `tsconfig`; these are the required flags.)
- **No `any`.** Ever. Prefer `unknown` followed by narrowing. If you truly cannot type something,
  that is a signal to stop and ask, not to reach for `any`.
- **No `@ts-ignore` / `@ts-expect-error` without a comment** on the same or preceding line
  explaining precisely why it is unavoidable.
- **Discriminated unions over loose objects.** Model "one of these shapes" with a tagged union, not
  an object full of optional fields that are really mutually exclusive.

## Module Organization

- **Feature-sliced.** Feature code lives under `frontend/src/features/<feature>/`. Each feature owns
  its own:
  - `messages.ts` — user-facing copy for that feature.
  - `select-options.ts` — enum/dropdown option lists, where relevant.
  - component files (`Thing.tsx`).
  - hooks (`useThing.ts`).
  - feature-local types.
- **Shared primitives** (buttons, inputs, layout shells reused across features) live in
  `frontend/src/components/`.
- **Shared lib** (the Supabase client, the logger, the API wrapper) lives in `frontend/src/lib/`.
- **Shared types** live in `frontend/src/types/`, **one concept per file** — never a mega
  `types.ts`.

## Interfaces and Types — Modular

**One concept per file.** A file named `types.ts` holding thirty unrelated interfaces is prohibited.
Name the file after the concept (`content-item.ts`, `relationship-type.ts`) and export the type(s)
for that single concept. (Enforces code review item #3.)

## Constants Files

`frontend/src/constants/` holds the cross-cutting constants:

- `env.ts` — the **only** place that reads environment variables; re-exports them as typed
  constants. (Enforces code review items #9, #15.)
- `routes.ts` — the `ROUTES` constant. No route string is written inline anywhere else.
- `http-status.ts` — named HTTP status code constants. No status-code magic numbers. (Enforces #11.)
- `error-codes.ts` — the stable `error.code` string values used in the envelope.
- `messages.ts` — **cross-feature** copy only. Feature-local copy stays in the feature folder's own
  `messages.ts`. (Enforces #4.)

## No Inline Magic

No string literals for **routes**, no magic numbers for **HTTP status codes** or other significant
constants, no stable **error codes** typed inline, and no repeated **UI copy** inline. Pull each
from its constants module. A literal that appears once and is genuinely local (e.g., a Tailwind
class string) is fine; a value that has meaning or repeats is a constant.

## API Response Envelope

Every Edge Function response and every coerced direct-query response has this shape:

```ts
{
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { /* pagination cursors, counts, etc. */ };
}
```

`success: true` carries `data`; `success: false` carries `error` with a stable `code` (from
`error-codes.ts`) and a human-readable `message`. **Chunk 01 will introduce the canonical Zod schema
for this envelope** in `backend/supabase/functions/_shared/schemas/`; until then this is the agreed
shape, not yet code.

## Validation Standards

- **Zod at every input boundary** — forms, Edge Function request bodies, and environment parsing.
- **Canonical schemas live in `backend/supabase/functions/_shared/schemas/`.** The frontend imports
  them through the `@shared` Vite + TS alias (e.g., `import { x } from "@shared/schemas/..."`).
- **The `@shared` alias is the only sanctioned cross-folder import.** Only modules under
  `@shared/schemas/*` may cross the `/frontend` ↔ `/backend` boundary. Reaching across that boundary
  for anything else is prohibited — stop and ask. (Enforces code review item #14.)
- **Same Zod version both sides.** Deno loads Zod via the `npm:zod` specifier so the backend and
  frontend validate against the same library version.
- **Chunk 02 creates the `schemas/` folder.** Until then the `@shared` alias resolves to an empty
  target; that is expected and not an error.

## Error Handling

Never let an error escape silently.

- **Edge Functions:** wrap the handler body in `try/catch`. Map **known** errors to a specific
  envelope `error.code`; map **unknown** errors to `INTERNAL_ERROR`, log the details through the
  logger, and return the envelope — never a raw stack trace to the client.
- **Frontend:** queries and mutations throw **stable string error codes** (from `error-codes.ts`).
  The UI catches them and maps the code to a message from the relevant `messages.ts`. UI never
  renders a raw error object.

## HTTP Status Codes

Use the named constants from `http-status.ts`; never the bare number.

- `200` — success with data.
- `201` — resource created.
- `204` — success, no content.
- `400` — validation failure (malformed request).
- `401` — unauthenticated.
- `403` — authenticated but unauthorized (RLS rejection).
- `404` — not found.
- `409` — conflict.
- `422` — semantic validation failure.
- `429` — rate limited.
- `500` — server error.

(Enforces code review item #11.)

## REST Conventions

Edge Functions are named after the **resource**, with plural collection nouns:

- `content-items`, `ideas`, `brand-context-files`.
- HTTP **method** carries the verb (`GET`/`POST`/`PATCH`/`DELETE`), never the path.
- **Sub-resources nest:** `ideas/{id}/siblings`.

(Enforces code review item #13.)

## Folder Structure

Canonical frontend layout (Chunk 01 scaffolds the concrete files):

```
frontend/src/
├── features/<feature>/   # feature-sliced UI, hooks, messages, types
├── components/           # shared UI primitives
├── lib/                  # supabase client, logger, api wrapper
├── constants/            # env, routes, http-status, error-codes, messages
└── types/                # one concept per file
```

Canonical backend layout (Chunk 02 scaffolds the concrete files):

```
backend/supabase/
├── migrations/           # SQL schema, owned by Chunk 02
└── functions/
    ├── _shared/          # code shared across Edge Functions (logger, schemas)
    │   └── schemas/      # canonical Zod schemas, imported by the frontend via @shared
    └── <resource>/       # one Edge Function per resource
```

`_shared` (folder name) and `@shared` (frontend alias) point to the **same place**, two names — see
`agents.md`, "A note on `_shared` vs `@shared`."

## Naming Conventions

- `PascalCase` — components and types.
- `camelCase` — variables and functions.
- `SCREAMING_SNAKE_CASE` — constants.
- `kebab-case` — folder names and file names of non-component modules.
- Hook files: `useThing.ts`. Component files: `Thing.tsx`.

## Logging Hygiene

**No `console.*` outside `logger.ts`.** A `logger.ts` exists in both `frontend/src/lib/` and
`backend/supabase/functions/_shared/`. In production the logger is a no-op or routes to a structured
destination; in development it writes to console. All other modules import the logger; none touch
`console` directly. (Enforces code review item #7.)

## Database Transactions

Any **multi-row write that must succeed or fail together** goes through a **Postgres function (RPC)**
or an **Edge Function** — never two sequential `supabase.from(...)` writes from the client that
could partially succeed. The boundary: if losing the second write would leave the first write
orphaned or inconsistent, it is a transaction and must be atomic. (Enforces code review item #10.)

## Multi-Table Atomic Writes

Any operation that must atomically write to **two or more tables** goes through a Postgres function
(RPC) called via `supabase.rpc(...)`. The pattern, codified across Chunks 04, 05, 06, and 07:

- The function is `language plpgsql` (or `sql` for read-only helpers) with `security invoker` so
  RLS enforces ownership against the caller. A user invoking the function on someone else's row
  sees `NOT_FOUND`, never another user's data.
- The function `set search_path = public` and is granted to `authenticated` only.
- It raises **distinct exception messages** (`NOT_FOUND`, `INVALID_TRANSITION`, `TOO_MANY_SPECS`,
  …) which PostgREST surfaces verbatim in `error.message`. The frontend maps each message to a
  stable `ERROR_CODES.*` value via a small `mapPgErrorMessageToErrorCode(message)` helper colocated
  with the feature. If a third feature needs the same map, extract it to `lib/pg-error-mapping.ts`.
- The implicit plpgsql transaction guarantees atomicity: a raised exception anywhere in the body
  rolls back ALL inserts and updates in the function. Manual rollback testing is a release gate
  (see Chunk 05's acceptance criteria, "Forcing a failure mid-loop rolls back ALL inserts").
- Returns are typed: prefer `returns setof public.<table>` (a row shape the frontend already has a
  Zod schema for) or `returns public.<table>` over a custom JSON payload. The frontend `safeParse`s
  the response against the canonical schema.

Reference implementations:

- `public.update_content_item_status` (Chunk 04) — single-table conditional update with a state
  machine; returns the updated row.
- `public.spawn_sibling_content_items` (Chunk 05) — multi-table fan-out write (N + N–1 rows
  across `content_items` and `content_relationships`); returns `setof content_items`.
- `public.spawn_cross_post_variants` (Chunk 06) — same shape, `'cross_post'` discriminator,
  source-platform invariant.
- `public.spawn_repurposed_children` (Chunk 07) — same shape, `'repurposed_from'` discriminator,
  notes start NULL on every child.
- `public.get_content_item_relations` (Chunks 05/06) — read-only RPC that hides the
  UNION-of-forward-and-reverse expansion behind a relationship_type-parameterized helper, so
  feature code doesn't need to know whether the input is a hub or a spoke.

## Read-Optimized Views

Aggregations needed across many rows (e.g., per-row relationship counts on the content-items
list) live in Postgres views with `security_invoker = true` (Postgres 15+). RLS on the underlying
tables evaluates as the calling role, so a caller sees only their own rows + their own
relationships.

The view is extended in place as new aggregates are added. Currently `public.content_items_list_view`
carries five aggregates covering all three relationship types: `cross_post_group_size`,
`sibling_group_size`, `repurposed_children_count`, `repurposed_from_parent_id`,
`repurposed_from_parent_title`. The corresponding Zod row schema is `ContentItemListRowSchema`
in `_shared/schemas/content-item.ts`.

Performance budget: the view runs three CASE/EXISTS branches + one LEFT JOIN per row. Each branch
hits an index on `content_relationships (user_id, parent_id)` / `(user_id, child_id)`. For users
with hundreds of items per page-load the per-row cost is bounded; if list latency degrades visibly
(>500ms on the list query), the next optimization is a **materialized view refreshed via triggers**
on `content_relationships` writes — that's a separate chunk, not an in-flight refactor. Do not add
denormalized counter columns to `content_items` itself without an explicit decision entry.

If the view's column list grows past ~5 aggregates (Chunk 09's pillar dashboard may want pillar
balance counts), stop and ask before adding more — restructuring is cheaper before it becomes a
hotspot.

## Charting Library

`recharts` is the sanctioned charting library. Permitted chart types: `<BarChart>` (vertical and
horizontal, including stacked) wrapped in `<ResponsiveContainer>` for fluid sizing.

Other recharts components (`LineChart`, `AreaChart`, `PieChart`, `ScatterChart`, `RadarChart`,
`Treemap`, `RadialBarChart`, `Sankey`) require an explicit justification in `/context/decisions.md`
before use. The point is consistency: a creator who has learned to read one panel's bars should
read every other panel the same way.

Rules of thumb:
- Charts live in feature folders, not in `src/components/charts/`. A shared chart library only
  makes sense once 3+ features need the same chart shape with the same data contract.
- Tooltip and tick content are rendered through dedicated React components (not the recharts
  default) so the visual treatment stays under our control.
- Chart colors come from the @theme tokens in `src/index.css` via `var(--color-*)`. No hardcoded
  hex values, ever.
- Container height is fixed-pixel (or a function of data length); never `height="100%"` against
  an unbounded parent — that triggers a layout-shift flash on first render.

Aggregations rendered by charts are pure functions in a sibling `*-aggregations.ts` file. Charts
themselves never fetch; they receive their data shape via props.

## Pure Functions Over Fetching Modules

Logic that transforms a known input into a deterministic output — assembling an export pack,
computing dashboard aggregations, bucketing calendar items — lives in a **pure function module**:
no fetching, no `Date.now()`, no `Math.random()` (unless explicitly seeded), no other ambient
reads. The function takes every dependency as a parameter, including the current date where one is
needed (pass an ISO date string in; never read the clock inside).

Reference implementations:
- `pack-builder.ts` (Chunk 10) — `buildPack(input)` → markdown string. The `generatedDate` is a
  parameter, so identical inputs always produce identical output.
- `dashboard-aggregations.ts` (Chunk 09) — rows + side-data → panel-shaped data.
- `calendar-grouping.ts` (Chunk 08) — rows → day-keyed buckets.

The benefit: these functions are trivial to reason about, trivial to mock at call sites, and
trivial to unit-test if a future chunk adds tests. The cost: callers must wire the dependencies
(fetch the rows, compute "today", pass them in) — we accept that explicitly. A function that needs
to fetch is a hook (`use*`), not a pure module; keep the two kinds in separate files.

## External API Integrations

Calls to external APIs (Anthropic in Chunk 11; any future provider in a later chunk) happen
**exclusively in Edge Functions, never in the frontend** — the frontend never holds a provider key.
Each integration is structured as three modules:

- **A config module** (`_shared/anthropic-config.ts`) pinning the model, API version, token cap,
  temperature, timeout, and rate limits. This is the single source of truth — no model string or
  endpoint is hardcoded anywhere else. Changing any of them is a one-line edit + a deploy.
- **A client module** (`_shared/anthropic-client.ts`) wrapping the `fetch` call with explicit error
  types (`AnthropicTimeoutError`, `AnthropicRequestError`) and an `AbortController` timeout. It
  **defensively narrows** the upstream response — reads only the specific fields it needs
  (`content[0].text`, `usage.*`), trusting nothing else about the shape.
- **A task layer** (`_shared/task-schemas.ts` + `task-handlers.ts`) that validates the request as a
  discriminated union and validates the model's output with Zod before returning. Downstream
  validation guarantees the data leaving the proxy matches our contract; a malformed upstream
  response becomes a stable error code, never a passthrough.

The proxy maps every failure to a canonical `ERROR_CODES` value and never reflects the upstream's
raw error text to the client (upstream bodies are truncated to 500 chars even in server logs).
Secrets (the provider key, the service role key) live only in the function's environment. Per-user
rate limiting is enforced before any upstream call. Observability rows (`ai_request_log`) capture
sizes/timing/codes — never bodies.

The backend's `_shared` modules use a Deno-side `logger.ts` (the only `console.*` caller in
`/backend`). The frontend ESLint config runs from `/frontend` and does not lint `/backend` (Deno
code); the no-`console`-outside-the-logger discipline there is enforced by code review.

## UI vs Domain Schemas

Zod schemas split by the lifetime of what they describe (introduced in Chunk 03):

- **Domain schemas** describe persistent entities (rows). They are canonical and shared: they live in
  `backend/supabase/functions/_shared/schemas/` and are imported on the frontend via
  `@shared/schemas/*` (e.g. `platform.ts`, `content-item.ts`).
- **UI-input schemas** describe transient form/UI inputs that never persist as-is (a sign-up form, a
  search box, an onboarding step). They live in the relevant **feature folder**, not in `_shared`
  (e.g. `features/auth/auth-schemas.ts`, `features/onboarding/onboarding-schemas.ts`).

Rule of thumb: if the shape maps to a table, it is a domain schema (`@shared`); if it exists only in
the browser to validate input, it is a UI schema (feature-local).

## Form Pattern (Canonical)

Every form follows the same pattern (doc-locked in Chunk 03; the sign-up form is the reference
example). If a later chunk diverges, document why in `decisions.md`.

1. A **UI-input Zod schema** (feature-local) plus its inferred input type.
2. `useForm<Input>({ resolver: zodResolver(Schema), defaultValues })` from `react-hook-form`.
3. shadcn **`<Form>` + `<FormField>` + `<FormItem>` + `<FormLabel>` + `<FormControl>` + inline
   `<FormMessage>`** for per-field errors. Submit via
   `onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}`.
4. A **React Query mutation hook** (`use*`) whose `mutationFn` throws a stable `ERROR_CODES` value on
   failure and (where relevant) invalidates the affected query in `onSuccess`.
5. The component maps the thrown code to copy from the feature's `messages.ts`, shows mutation
   errors in a top-level destructive **`<Alert>`**, and fires a **`toast`** on success/error.
6. Submit buttons **disable + show busy text** while pending; they never disappear.
7. Required fields carry a visible asterisk + sr-only "required" text (the shared `<RequiredMark />`).

## State Machines

State machines (statuses, lifecycles) live in three places that must agree (introduced in Chunk 04
for the content-item lifecycle):

- **(a) A Zod source-of-truth** in `_shared/schemas/` that exports the transition table (e.g.
  `CONTENT_ITEM_STATUS_TRANSITIONS` + `isAllowedStatusTransition` in `content-item.ts`).
- **(b) A Postgres function** that mutates the column (e.g. `public.update_content_item_status`),
  mirroring the transition table **inline** and raising distinct exception messages the frontend maps
  to error codes. Status changes route through this RPC; non-status edits use a plain `update`.
- **(c) The database's own check constraints**, which describe the **value set** (which values are
  legal) — not the transitions.

The Zod file is the source of truth; the Postgres function mirrors it. When you change the
transition rules, update **both** (a) and (b) and document the change in `decisions.md`. They are not
codegen-linked yet; if keeping them in sync becomes painful, propose a codegen step in a later chunk.
