import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';

export const dashboardMessages = {
  page: {
    title: 'Dashboard',
    subtitle: "How your content is balanced and how often you're shipping.",
  },
  windowSelector: {
    label: 'Window',
  },
  panels: {
    pillarBalance: {
      title: 'Pillar balance',
      help: 'Scheduled and published items in the visible window. Drafts and ideas are excluded.',
      empty: 'Nothing categorized by pillar yet in this window.',
      noPillarRowLabel: 'No pillar',
      barAriaLabel: 'Pillar balance bar chart',
      countLabel: 'items',
    },
    cadence: {
      title: 'Cadence vs targets',
      help: "Counts published items only. Scheduled items aren't yet output.",
      headerPlatform: 'Platform',
      headerTarget: 'Target/wk',
      headerActual: 'Actual/wk',
      headerDelta: 'Delta',
      headerState: 'Status',
      onTarget: 'On target ✓',
      under: 'Under target ↓',
      over: 'Over target ↑',
      untracked: 'Untracked',
      noTargets:
        'Set targets in onboarding or in Settings to see your cadence here.',
      rowLinkAria: (platformName: string) =>
        `Open ${platformName} content items`,
    },
    statusMix: {
      title: 'Pipeline mix',
      help: 'All items created in the visible window.',
      empty: 'Nothing created yet in this window.',
      chartAriaLabel: 'Pipeline status mix bar chart',
      tooltipFor: (status: string) => `${status} items`,
    },
    emptyCells: {
      title: 'Top empty cells',
      help: 'Pillar + platform pairs where you have no published items in the window.',
      none: 'Every pillar/platform pair has something published. Nice.',
      cta: 'Create',
      rowLinkAria: (pillarName: string, platformName: string) =>
        `Create new ${pillarName} content for ${platformName}`,
    },
  },
  firstRun: {
    title: 'Your dashboard lights up once you start creating content.',
    body: 'Capture your first idea, or jump straight to creating a content item.',
    ctaIdea: 'Capture an idea',
    ctaItem: 'New content item',
  },
  errors: {
    generic: 'We couldn’t load the dashboard.',
    body: 'One of the dashboard queries failed. Try again to refresh all panels.',
    retry: 'Retry',
  },
} as const;

// Calendar-style narrow error map. Aggregations live entirely client-side, so any error here is
// a network/RLS/schema-mismatch failure on the underlying queries.
const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.INTERNAL_ERROR]: dashboardMessages.errors.generic,
  [ERROR_CODES.INVALID_RESPONSE]: dashboardMessages.errors.generic,
  [ERROR_CODES.NOT_AUTHENTICATED]: 'Please sign in again.',
};

export function dashboardErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? dashboardMessages.errors.generic;
}
