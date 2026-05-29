# Progress Tracker

## Current Phase
Phase 0 — Foundation (auth + onboarding complete; first real feature views begin in Chunk 04).

## Completed Chunks
- Chunk 00 — Repository bootstrap, folder scaffolding, context authoring.
- Chunk 01 — Foundational standards: Vite + React + TypeScript (strict) SPA; ESLint flat config (no-`any`, no-`console` outside `logger.ts`, `ban-ts-comment` without description); the constants layer; `logger.ts`; the API response envelope; and the `@/` + `@shared` path aliases.
- Chunk 02 — Backend: `supabase init` (local stack on 54321/54322/54323); 9 timestamped migrations + `updated_at` triggers, check-constraint enums, and read-pattern indices; RLS (`auth.uid() = user_id`) on every user-owned table; the canonical `_shared/` folder (Zod schemas + constants + response helpers); `seed.sql` demo data. The `@shared` alias resolves to real schemas; the frontend re-exports the canonical envelope.
- Chunk 03 — Frontend Supabase client (`lib/supabase.ts`) + React Query (`lib/query-client.ts`); React Router v6 data router with `RequireAuth` + `RequireOnboarded` guards and the `AppShell`; email/password auth (`useAuth`, `useSignUp/SignIn/SignOut`, sign-in/up pages); the 3-step onboarding wizard (platforms → pillars → cadence) with derived onboarding status; the design system migrated to **Tailwind v4** + **shadcn (radix-nova)** with 10 primitives. `typecheck`/`lint`/`build` pass; auth + onboarding writes + cross-user RLS isolation verified against the live local API; the app boots + renders in a real browser.

## Next Up
- Chunk 04 — The first real authenticated view: fill `/dashboard` (currently a placeholder) with the content-item list (replacing `DashboardPlaceholder`), reading `content_items` via the Supabase client with the established query/list patterns.

## In-Progress Chunks
None.

## Blocked Chunks
None.

## Known Issues
None blocking. Toolchain ran ahead of the spec's examples again in Chunk 03 (shadcn CLI 4.x targets Tailwind v4); the **locked "Tailwind v3" decision was reversed to v4 with the human's approval** — logged in `/context/decisions.md` (2026-05-29 — Chunk 03), along with all shadcn-4.x adaptations.

## Decisions Made
See `/context/decisions.md`.

## Next Steps
1. Build the dashboard content-item list (Chunk 04): a `features/dashboard` (or `features/content-items`) list view reading `content_items`, rendered inside the `AppShell` at `/dashboard`.
2. Reuse the canonical form pattern + the `@shared` domain schemas (`content-item.ts`) for any create/edit affordances.
3. Add the `/content-items`, `/ideas`, `/calendar`, etc. routes (currently only `/dashboard` is wired; the AppShell nav links to them but they 404 until built).

## Notes for Next Agent
- **Design system is Tailwind v4 + shadcn "radix-nova".** Primitives live in `src/components/ui/`; add more with `npx shadcn@latest add <name>` (CLI 4.8.2). Theme tokens (incl. status colors + Inter) are `@theme` entries in `src/index.css`.
- `form.tsx` is **hand-vendored** (radix-nova ships a `field` component, not `form`) and `sonner.tsx` was edited to drop `next-themes`. There is an ESLint override turning off `react-refresh/only-export-components` for `src/components/ui/**`.
- The **canonical form pattern** and the **UI-vs-domain schema rule** are documented in `/context/03-code-standards.md`.
- The `@shared` Zod schemas import bare `zod`. The frontend resolves it two ways: `tsconfig.json` paths (for `tsc`) and a `vite.config.ts` alias `zod` → `node_modules/zod` (for the rolldown bundler, needed once an `@shared` file is actually imported). Deno resolves it via `deno.json`.
- `frontend/.env` (gitignored) holds the LOCAL Supabase URL + anon key; `.env.example` carries placeholders. Local stack: API `http://127.0.0.1:54321`. Get the anon key from `supabase status` in `/backend`.
- Email confirmations are OFF locally, so `signUp` returns a live session → sign-up routes straight to `/onboarding`.
- A `.claude/launch.json` ("frontend" → `npm run dev` on 5173) exists for the in-IDE preview tool.
