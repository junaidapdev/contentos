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
