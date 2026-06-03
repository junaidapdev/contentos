import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';

export const contentItemMessages = {
  list: {
    title: 'Content items',
    subtitle: 'Everything you’re planning, drafting, scheduling, and publishing.',
    newButton: '+ New content item',
    loadMore: 'Load more',
    retry: 'Retry',
    loadError: 'We couldn’t load your content items.',
    updatedPrefix: 'Updated',
    fromIdeaPrefix: 'From idea:',
    repurposedFromPrefix: 'from:',
    crossPostBadge: (n: number) => `+${n - 1} platforms`,
    crossPostBadgeTooltip: (n: number) =>
      `Part of a cross-post group of ${n} platform${n === 1 ? '' : 's'}.`,
    siblingBadge: (n: number) => `+${n - 1} siblings`,
    siblingBadgeTooltip: (n: number) =>
      `Part of a sibling group of ${n} item${n === 1 ? '' : 's'} from the same idea.`,
    repurposedChildrenBadge: (n: number) => `→${n} repurposed`,
    repurposedChildrenBadgeTooltip: (n: number) =>
      `${n} item${n === 1 ? ' was' : 's were'} repurposed from this.`,
    emptyTitle: 'No content items yet',
    emptyBody: 'Create your first one to get started.',
    emptyCta: '+ New content item',
    emptyFilteredTitle: 'No items match these filters',
    emptyFilteredBody: 'Try clearing or changing the filters above.',
    clearFilters: 'Clear filters',
    errorBody: 'We couldn’t load your content items. Try again to refetch.',
    dash: '—',
  },
  filters: {
    statusLabel: 'Status',
    platformLabel: 'Platform',
    pillarLabel: 'Pillar',
    allStatuses: 'All statuses',
    allPlatforms: 'All platforms',
    allPillars: 'All pillars',
    clear: 'Clear filters',
  },
  form: {
    titleLabel: 'Title',
    titlePlaceholder: 'What’s this piece about?',
    formatLabel: 'Format',
    platformLabel: 'Platform',
    pillarLabel: 'Pillar',
    ideaLabel: 'Idea',
    statusLabel: 'Status',
    scheduledForLabel: 'Scheduled for',
    publishedAtLabel: 'Published at',
    publishedUrlLabel: 'Published URL',
    publishedUrlPlaceholder: 'https://…',
    notesLabel: 'Notes',
    notesPlaceholder: 'Hooks, outline, links, anything…',
    none: 'None',
    cancel: 'Cancel',
    create: 'Create content item',
    creating: 'Creating…',
    save: 'Save changes',
    saving: 'Saving…',
  },
  newPage: {
    title: 'New content item',
    subtitle: 'Add a piece to your pipeline. It starts as an idea.',
  },
  detail: {
    title: 'Edit content item',
    subtitle: 'Edit any field. Status changes follow the lifecycle rules.',
    deleteButton: 'Delete',
    backToList: '← Back to content items',
    notFound: 'This content item doesn’t exist or you don’t have access.',
  },
  siblings: {
    heading: 'Siblings',
    fromIdeaPrefix: 'From idea:',
    emptyTitle: 'No siblings',
    emptyBody: 'This item isn’t linked to any sibling content items.',
    loadError: 'We couldn’t load this item’s siblings.',
  },
  crossPost: {
    panel: {
      heading: 'Cross-posts',
      subtitle: (covered: number, total: number) => `(${covered}/${total} platforms covered)`,
      empty: 'This isn’t cross-posted yet. Spread it across your other platforms.',
      addCta: 'Add cross-post',
      requiresPlatform: 'Set a platform on this item to enable cross-posting.',
      requiresMultiplePlatforms:
        'Cross-posting needs at least two active platforms. Add more in Settings.',
      loadError: 'We couldn’t load this item’s cross-post group.',
    },
    dialog: {
      title: 'Cross-post to which platforms?',
      note:
        'We’ll create a new draft on each selected platform, linked to this asset. Each variant is independent — edit each platform’s copy separately.',
      noPlatformsTitle: 'No platforms left',
      noPlatformsBody: 'Every active platform already has a variant of this asset.',
      errorTitle: 'We couldn’t cross-post.',
      cancel: 'Cancel',
      submit: (n: number) =>
        n === 1 ? 'Cross-post to 1 platform' : `Cross-post to ${n} platforms`,
      submitting: 'Cross-posting…',
    },
    missingLabel: 'Missing',
    sourceLabel: 'Source',
    addCtaShort: 'Add',
    addToPlatformAria: (platform: string) => `Add cross-post to ${platform}`,
    toasts: {
      spawned: (n: number) =>
        n === 1 ? 'Cross-posted to 1 platform.' : `Cross-posted to ${n} platforms.`,
    },
  },
  repurpose: {
    panel: {
      titleDefault: 'Repurposing',
      titleParentOnly: 'Repurposed into',
      titleChildOnly: 'Repurposed from',
      titleChain: 'In a repurposing chain',
      empty: 'Track repurposed items',
      emptyBody: 'Long-form pieces can fuel many short ones. Track them here.',
      emptyCta: 'Add repurposed items',
      loadError: 'We couldn’t load this item’s repurposing chain.',
    },
    dialog: {
      title: 'What does this repurpose into?',
      note:
        'Each repurposed item is a new draft linked back to this source. You can change the title, format, platform, and pillar per item.',
      itemLabel: (index: number) => `Item ${index + 1}`,
      specTitleLabel: 'Title (optional)',
      specTitlePlaceholder: 'Defaults to the source title',
      specFormatLabel: 'Format',
      specPlatformLabel: 'Platform',
      specPillarLabel: 'Pillar',
      none: 'None',
      addRow: '+ Add another item',
      removeRowAria: (index: number) => `Remove item ${index + 1}`,
      errorTitle: 'We couldn’t add those items.',
      cancel: 'Cancel',
      submit: (n: number) =>
        n === 1 ? 'Add 1 repurposed item' : `Add ${n} repurposed items`,
      submitting: 'Adding…',
    },
    sourceLabel: 'Source',
    addMoreCta: '+ Add more repurposed items',
    parentLinkAria: (title: string) => `Open source item: ${title}`,
    toasts: {
      spawned: (n: number) =>
        n === 1 ? 'Added 1 repurposed item.' : `Added ${n} repurposed items.`,
    },
  },
  delete: {
    title: 'Delete this content item?',
    body: 'This cannot be undone.',
    confirm: 'Delete',
    confirming: 'Deleting…',
    cancel: 'Cancel',
  },
  toasts: {
    created: 'Content item created.',
    updated: 'Changes saved.',
    statusChanged: (label: string) => `Status changed to ${label}.`,
    deleted: 'Content item deleted.',
    createFailed: 'We couldn’t create this item. Try again.',
    updateFailed: 'We couldn’t update this item. Try again.',
    deleteFailed: 'We couldn’t delete this item. Try again.',
  },
} as const;

// Partial: not every code has content-item-specific copy; the rest fall back generically.
const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.VALIDATION_FAILED]: 'Please check the form and try again.',
  [ERROR_CODES.NOT_FOUND]: 'This content item doesn’t exist or you don’t have access.',
  [ERROR_CODES.CONFLICT]:
    'That platform is already covered by this cross-post group. Pick a different one.',
  [ERROR_CODES.INVALID_TRANSITION]: 'This status change isn’t allowed from the current state.',
  [ERROR_CODES.SCHEDULED_REQUIRES_DATE]: 'Set a scheduled date before scheduling this item.',
  [ERROR_CODES.PUBLISHED_REQUIRES_DATE]:
    'Set a published date before marking this item as published.',
  [ERROR_CODES.INVALID_RESPONSE]: 'The server returned unexpected data. Try again.',
  [ERROR_CODES.NOT_AUTHENTICATED]: 'Please sign in again.',
};

export function contentItemErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'We couldn’t complete that. Try again.';
}
