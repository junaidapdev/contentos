# ContentEngine — Frontend

Vite + React + TypeScript SPA. Talks directly to Supabase for non-secret operations; calls Edge Functions only for secret-holding work.

## Quickstart

```bash
nvm use
npm install
cp .env.example .env
npm run dev
```

## Scripts

- `npm run dev` — Vite dev server on http://localhost:5173
- `npm run build` — production bundle to `dist/`
- `npm run preview` — preview the production bundle
- `npm run typecheck` — TypeScript no-emit check
- `npm run lint` — ESLint with `--max-warnings 0`
- `npm run format` — Prettier write

## Path aliases

- `@/*` → `src/*`
- `@shared/*` → `../backend/supabase/functions/_shared/*` — **only** Zod schemas may be imported across this boundary.

## House rules

- No `any`. ESLint will block.
- No `console.*` outside `src/lib/logger.ts`. ESLint will block.
- All user-facing copy in `messages.ts` files per feature.
- All routes via `ROUTES` constants from `src/constants/routes.ts`.
- All HTTP status codes via `HTTP_STATUS` from `src/constants/http-status.ts`.
- All error codes via `ERROR_CODES` from `src/constants/error-codes.ts`.

## Auth model

- Anonymous users see only `/`, `/sign-in`, `/sign-up`.
- Signed-in but not-onboarded users are routed to `/onboarding`.
- Fully onboarded users land at `/dashboard` and have access to the full nav.
- The `RequireAuth` guard handles redirect to sign-in; the `RequireOnboarded` guard handles redirect to onboarding.
- Onboarding completion is **derived** (≥1 platform AND ≥1 pillar), not a stored flag.
- Sessions persist in localStorage via Supabase JS defaults.

See `/context/03-code-standards.md` for the full rule set.
