import { ROUTES } from './routes';

// Cross-feature UI copy (used by shared components / layouts). Feature-specific copy lives in each
// feature's own messages.ts. See /context/03-code-standards.md, "Constants Files".
export const COMMON_MESSAGES = {
  appName: 'ContentEngine',
  loading: 'Loading…',
  required: 'required',
} as const;

// Sidebar nav. Only includes routes that have a handler in `App.tsx` — listing an
// unimplemented route here would 404 on click. The `ROUTES.PILLARS`, `ROUTES.CADENCE`, and
// `ROUTES.SETTINGS` constants stay in `routes.ts` so a future chunk can wire dedicated
// management pages and re-add the nav entries with one line each. Until then, pillars and
// cadence are configured during onboarding.
export const NAV_ITEMS: ReadonlyArray<{ to: string; label: string }> = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard' },
  { to: ROUTES.CONTENT_ITEMS, label: 'Content items' },
  { to: ROUTES.CALENDAR, label: 'Calendar' },
  { to: ROUTES.IDEAS, label: 'Ideas' },
  { to: ROUTES.BRAND_CONTEXT, label: 'Brand context' },
];

export const APP_SHELL_MESSAGES = {
  signingOut: 'Signing out…',
  signOut: 'Sign out',
  openNav: 'Open navigation menu',
  closeNav: 'Close navigation menu',
  navLandmark: 'Main navigation',
} as const;

export const HOME_MESSAGES = {
  tagline: 'The content operations command center for solo creators.',
  blurb:
    'Plan, track, and repurpose everything you publish across YouTube, Instagram, LinkedIn, X, and newsletters — in one place.',
  signIn: 'Sign in',
  signUp: 'Create account',
} as const;

export const NOT_FOUND_MESSAGES = {
  title: 'Page not found',
  body: 'That page doesn’t exist or has moved.',
  cta: 'Go home',
} as const;
