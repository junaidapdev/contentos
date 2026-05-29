// Single source of truth for client routes. No inline route strings anywhere else.
// Patterns are for React Router's <Route path={...}>. Builders produce concrete URLs for navigation.
export const ROUTES = Object.freeze({
  HOME: '/',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  CALENDAR: '/calendar',
  IDEAS: '/ideas',
  IDEA_NEW: '/ideas/new',
  IDEA_DETAIL_PATTERN: '/ideas/:id',
  ideaDetail: (id: string) => `/ideas/${id}`,
  CONTENT_ITEMS: '/content-items',
  CONTENT_ITEM_DETAIL_PATTERN: '/content-items/:id',
  contentItemDetail: (id: string) => `/content-items/${id}`,
  PILLARS: '/pillars',
  CADENCE: '/cadence',
  BRAND_CONTEXT: '/brand-context',
  SETTINGS: '/settings',
  NOT_FOUND: '*',
});

export type RoutePattern = (typeof ROUTES)[keyof typeof ROUTES];
