# ContentEngine — Frontend

Vite + React + TypeScript SPA. Talks directly to Supabase for non-secret operations; calls Edge Functions only for secret-holding work.

## Features (live)

- **Auth + onboarding** — email/password sign up/in; 3-step onboarding (platforms → pillars → cadence) with derived completion.
- **Content items** (`/content-items`) — list with filters + cursor pagination; new/edit/delete; lifecycle state machine.
- **Ideas** (`/ideas`) — CRUD + the **sibling spawning** flow (one idea → many native posts in one atomic call).
- **Cross-post grouping** — per-platform status grid on each item's detail page; "+N platforms" badge on the list.
- **Repurposing chains** — long-form parent → derivative children; tree-shaped, with parent + children panels on detail and list-row badges.
- **Calendar** (`/calendar`) — month-grid view of every scheduled or published item across platforms; URL-state filters; popover with relationship indicators; companion agenda panel.
- **Dashboard** (`/dashboard`) — pillar balance, cadence vs targets, pipeline mix, and top empty (pillar × platform) cells. Trailing 7/30/90 day window selector. Charts via recharts (sanctioned: `<BarChart>` + `<ResponsiveContainer>`).
- **Brand context** (`/brand-context`) — the **AI-handoff wedge**. CRUD on reusable context files (voice, audience, offers, platform rules, do's & don'ts, examples), grouped by kind. The export composer assembles a versioned **`v1` markdown content pack** (brand context + optional published examples + optional idea scope) you copy or download and paste into Claude / ChatGPT / Cursor. Idea detail pages have a one-click "Export pack for this idea". Pack assembly is pure + deterministic (`pack-builder.ts`); the pack is never rendered as HTML in-app.

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

## Deployment

The frontend deploys to **Vercel** from the `main` branch automatically on push. Every pull request gets its own preview URL. See `/context/13-deployment-runbook.md` for the full operational guide (setup, per-release flow, smoke test, rollback).

Production URL: `https://contentengine-prod.vercel.app` (or as configured during one-time setup).

Build config lives in [`vercel.json`](./vercel.json) — framework preset, build/install commands, and the SPA rewrite (`/(.*)` → `/index.html`) that lets React Router resolve deep links on hard-reload.

Environment variables required in Vercel (apply to Production, Preview, and Development scopes):

- `VITE_APP_NAME` — non-secret display name
- `VITE_APP_ENV` — non-secret runtime tag (`production` / `preview` / `development`)
- `VITE_SUPABASE_URL` — the hosted Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — the publishable/anon key (treat as restricted per the runbook even though it's not secret by RLS model)

Local development uses the same variable names via `frontend/.env`. See `.env.example`.

CI (`.github/workflows/ci.yml`) runs typecheck + lint + build on every PR and push to `main`, with placeholder env vars so the Zod env validator passes. Real values come from Vercel for actual deploys.
