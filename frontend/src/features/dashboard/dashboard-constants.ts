import type { ContentItemStatus } from '@shared/schemas/content-item';

// Trailing-window options exposed in the header selector. Days are normalized in the cadence
// aggregation (count ÷ (days/7)) so 7/30/90 are directly comparable. Longer windows (180/365)
// are out of MVP — would require more data than a brand-new user has.
export const DASHBOARD_WINDOW_OPTIONS = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
] as const;

export type DashboardWindowValue = (typeof DASHBOARD_WINDOW_OPTIONS)[number]['value'];

export const DEFAULT_DASHBOARD_WINDOW: DashboardWindowValue = '30d';

// "On target" tolerance for cadence delta: ±15% of the per-week target. Revisit in decisions.md
// if user testing reveals this is too strict (creators are rarely perfectly on cadence) or too
// loose (the indicator stops being useful).
export const CADENCE_DELTA_TOLERANCE = 0.15;

// Cap on rows shown in the Top Empty Cells panel. Above 5 the panel becomes a list of every
// gap a creator has; the value of the panel is "where to focus next," not exhaustive.
export const TOP_EMPTY_CELLS_LIMIT = 5;

// Pillar bar color — reuses the Chunk 03 status-scheduled token because pillar balance is a
// "what's queued" signal, not a status signal. CSS custom-property reference works in recharts
// `fill` props because Tailwind v4 emits the @theme vars onto :root.
export const PILLAR_BAR_COLOR = 'var(--color-status-scheduled)';

// Status mix segment colors — each segment uses the canonical status token. Ordered to match
// CONTENT_ITEM_STATUS_VALUES so the stacked bar reads left-to-right in lifecycle order.
export const STATUS_MIX_COLORS: Record<ContentItemStatus, string> = {
  idea: 'var(--color-status-idea)',
  drafting: 'var(--color-status-drafting)',
  ready: 'var(--color-status-ready)',
  scheduled: 'var(--color-status-scheduled)',
  published: 'var(--color-status-published)',
};

// Cadence indicator pill semantic tokens. DELIBERATELY DISTINCT FROM THE STATUS PALETTE per
// the chunk-09 decisions.md — these aren't status indicators (they're "are you keeping up"
// indicators) and reusing status-published for "on target" would dilute the status color
// vocabulary. Tailwind named scales here; we're not creating new @theme tokens for one panel.
export const CADENCE_INDICATOR_CLASSES = {
  on_target: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  under: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  over: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  untracked: 'bg-muted text-muted-foreground ring-1 ring-input',
} as const;

// React Query key root. Exported so the dashboard query family can be invalidated precisely if
// a future chunk needs to (e.g., after a publish-now mutation).
export const DASHBOARD_QUERY_KEY_ROOT = 'dashboard';
