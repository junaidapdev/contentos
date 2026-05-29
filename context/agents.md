# Agents — Master Instruction File

## Who This File Is For

This file is for **any AI agent** about to work in this repository — Claude Code, Cursor, Codex,
Windsurf, or any other. The root `CLAUDE.md` and `AGENTS.md` both route here. If you are an agent
and you are reading anything in this repo, read this file first and follow it.

## The Five-Step Ritual Before Any Chunk

Do these in order, every time, before writing any code:

1. **Read this file end-to-end.**
2. **Read the six numbered context files in order** — `01-project-overview.md` through
   `06-progress-tracker.md`.
3. **Read `/context/decisions.md`** — the locked-in and accumulated decisions.
4. **Read `/feature-specs/chunk-XX-*.md`** for the chunk you have been assigned.
5. **Read the existing code touched by the spec** (if any), so you change it in keeping with how it
   already works.

## The Four Guardrails During Implementation

While implementing, hold these lines:

- **Do not exceed the spec's scope.** If it isn't in the spec, don't build it.
- **Do not refactor unrelated code.** Note problems in `decisions.md`; leave the fix for a future
  chunk.
- **Do not add dependencies** that the spec does not list. New dependencies require a justification
  entry in `decisions.md`.
- **Do not introduce inline strings, magic numbers, or `any`.** Copy comes from `messages.ts`,
  routes from `ROUTES`, status codes and error codes from their constants modules, and types are
  real types — never `any`.

See `04-ai-workflow-rules.md` for the reasoning behind each guardrail.

## The Three-Step Ritual After Completing a Chunk

When the chunk's work is done, before you report back:

1. **Update `/context/06-progress-tracker.md`** — move the chunk to Completed, set the next chunk as
   Next Up, and add a "Notes for Next Agent" entry.
2. **Append any new decisions to `/context/decisions.md`** with the date and the rationale.
3. **Summarize in your final response to the human** — the files created/modified, the test
   results, and any deviations from the spec.

## When to Stop and Ask

Stop and ask the human whenever you hit:

- any **architectural ambiguity**,
- any **cross-cutting concern** (auth, schema, validation, deploy) not already settled by `/context`,
  or
- any **temptation to deviate from a locked-in decision** in `decisions.md`.

Guessing on these is worse than pausing. Stop. Ask.

## A Note on the `@shared` Alias

`@shared` is the **only sanctioned cross-folder import** in this repo. It exists so the frontend can
import canonical Zod schemas from the backend. If you find yourself reaching across the
`/frontend` ↔ `/backend` boundary for **anything other than a Zod schema under `@shared/schemas/*`**,
stop and ask. That is the one door between the two folders, and it only passes schemas.

## A Note on `_shared` vs `@shared`

These look alike and mean related but distinct things:

- **`_shared`** is a **folder name** inside `/backend/supabase/functions/`. It is the Supabase
  convention for code shared between Edge Functions, and Edge Functions import from it via **relative
  paths**.
- **`@shared`** is the **Vite + TypeScript path alias** that resolves, from the frontend, to that
  same `_shared` folder.

Same place, two names. The backend reaches it by relative path as `_shared`; the frontend reaches it
by alias as `@shared`. Don't confuse them, and don't invent a third way in.
