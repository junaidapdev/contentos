import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';
import type { PlatformSlug } from '@shared/schemas/platform';
import {
  CONTENT_ITEM_STATUS_VALUES,
  type ContentItemStatus,
} from '@shared/schemas/content-item';

export const calendarMessages = {
  page: {
    title: 'Calendar',
    subtitle: 'Everything you have scheduled or published, across every platform.',
  },
  nav: {
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    today: 'Today',
  },
  filters: {
    statusLabel: 'Status',
    platformLabel: 'Platform',
    pillarLabel: 'Pillar',
    clearLabel: 'Clear filters',
    anyPlatform: 'Any platform',
    anyPillar: 'Any pillar',
    statusButtonAria: (count: number) =>
      count === 0
        ? 'Filter by status — none selected'
        : `Filter by status — ${count} selected`,
    statusActiveCount: (count: number) => `${count}`,
    statusResetToDefault: 'Reset to default',
  },
  grid: {
    cellAriaLabel: (longDate: string, itemCount: number) =>
      itemCount === 0
        ? longDate
        : itemCount === 1
          ? `${longDate}, 1 item`
          : `${longDate}, ${itemCount} items`,
    todayAriaSuffix: ' (today)',
    overflowMore: (n: number) => `+${n} more`,
    weekdayHeaderSrLabel: (longWeekday: string) => longWeekday,
  },
  chip: {
    ariaLabel: (title: string, statusLabel: string, platformLabel: string | null) =>
      platformLabel === null
        ? `${title}, ${statusLabel}`
        : `${title}, ${statusLabel} on ${platformLabel}`,
    timeLabel: (time: string) => time,
    indicatorCrossPostLabel: 'Cross-post group',
    indicatorSiblingLabel: 'Sibling of the same idea',
    indicatorRepurposedFromLabel: 'Repurposed from another item',
    indicatorRepurposedIntoLabel: 'Repurposed into other items',
  },
  popover: {
    openCta: 'Open',
    closeCta: 'Close',
    dateLabel: 'Date',
    platformLabel: 'Platform',
    pillarLabel: 'Pillar',
    formatLabel: 'Format',
    statusLabel: 'Status',
    relationships: {
      crossPost: (count: number) => `Cross-post group of ${count} platforms`,
      sibling: (count: number) => `Sibling group of ${count} items from the same idea`,
      repurposedFrom: (title: string) => `Repurposed from: ${title}`,
      repurposedInto: (count: number) =>
        count === 1
          ? '1 item was repurposed from this'
          : `${count} items were repurposed from this`,
    },
  },
  agenda: {
    heading: 'Agenda',
    toggleShow: 'Show list',
    toggleHide: 'Hide list',
    dayHeader: (shortDate: string, count: number) =>
      count === 1 ? `${shortDate} — 1 item` : `${shortDate} — ${count} items`,
    empty: 'No items in this month.',
  },
  empty: {
    titleNoFilters: 'Nothing scheduled or published this month.',
    bodyNoFilters: 'Schedule a content item to see it here.',
    ctaNoFilters: 'Go to content items',
    titleFiltered: 'No items match your filters this month.',
    bodyFiltered: 'Try clearing a filter or moving to another month.',
  },
  errors: {
    loadFailed: 'We couldn’t load your calendar.',
    body: 'Try again to refetch this month’s items.',
    retry: 'Retry',
  },
} as const;

// Display labels for the status filter and chip popovers. Re-exports the canonical status enum
// in an ordered array, paired with display labels. We keep the calendar's labels separate from
// the content-items feature's STATUS_LABELS so the calendar can evolve independently if needed
// (it doesn't right now — they happen to match).
export const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: ContentItemStatus; label: string }> = [
  { value: 'idea', label: 'Idea' },
  { value: 'drafting', label: 'Drafting' },
  { value: 'ready', label: 'Ready' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
];

// Defense: keep this array in sync with the enum. If someone adds a status value upstream and
// forgets here, the compile-time check fires.
const STATUS_FILTER_VALUE_SET = new Set(STATUS_FILTER_OPTIONS.map((o) => o.value));
for (const value of CONTENT_ITEM_STATUS_VALUES) {
  if (!STATUS_FILTER_VALUE_SET.has(value)) {
    throw new Error(`Calendar STATUS_FILTER_OPTIONS missing status: ${value}`);
  }
}

// Curated 2-char abbreviations for the chip platform tag. Maintained centrally so the chip never
// computes them ad-hoc (auto-derived first-2-chars would produce ambiguous "TI" for both TikTok
// and Threads-International if we ever localize the slug list).
export const PLATFORM_ABBREVIATIONS: Record<PlatformSlug, string> = {
  youtube: 'YT',
  instagram: 'IG',
  linkedin: 'LI',
  x: 'X',
  substack: 'SS',
  blog: 'BL',
  tiktok: 'TT',
  threads: 'TH',
  newsletter: 'NL',
};

// Map an error code thrown by useCalendarWindow to user-facing copy. Falls back to the generic
// load-failure message — same approach as other feature errors.
const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.INTERNAL_ERROR]: calendarMessages.errors.loadFailed,
  [ERROR_CODES.INVALID_RESPONSE]: 'The server returned unexpected data. Try again.',
  [ERROR_CODES.NOT_AUTHENTICATED]: 'Please sign in again.',
};

export function calendarErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? calendarMessages.errors.loadFailed;
}
