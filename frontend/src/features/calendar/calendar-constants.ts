// How many chips can appear inside a single day cell before "+N more" replaces the overflow.
// 3 fits comfortably at the spec's ~120px desktop cell height; raising this would force taller
// cells (or smaller chips), both of which hurt scannability per /context/05-ui-context.md.
export const MAX_CHIPS_PER_CELL = 3;

// 0 = Sunday, 1 = Monday. Mon-start matches the spec's "Mon–Sun by default" guidance and is the
// ISO 8601 convention. Locale-aware week start is a later enhancement (decisions.md).
export const WEEK_START_DAY = 1;

// Defense-in-depth bound on the URL `month=YYYY-MM` param. Years outside this range fall back to
// "current month" silently rather than throwing — keeps URL hacking benign.
export const MIN_VALID_YEAR = 1970;
export const MAX_VALID_YEAR = 9999;

// React Query key family for the calendar. Exported so future invalidations from item-mutation
// hooks (e.g., status changes that re-schedule) can target the window query family precisely.
export const CALENDAR_QUERY_KEY_ROOT = 'calendar';
