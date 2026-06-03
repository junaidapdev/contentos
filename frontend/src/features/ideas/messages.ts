import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';

export const ideaMessages = {
  list: {
    title: 'Ideas',
    subtitle: 'Capture concepts once. Turn each one into multiple native posts.',
    newButton: '+ New idea',
    loadMore: 'Load more',
    retry: 'Retry',
    loadError: 'We couldn’t load your ideas.',
    updatedPrefix: 'Updated',
    pillarPrefix: 'Pillar',
    siblingsCount: (n: number) => `${n} item${n === 1 ? '' : 's'} spawned`,
    emptyTitle: 'No ideas yet',
    emptyBody:
      'Capture your first concept — you can turn it into multiple posts later.',
    emptyCta: '+ New idea',
    errorBody: 'We couldn’t load the ideas list. Try again to refetch.',
    dash: '—',
  },
  form: {
    titleLabel: 'Title',
    titlePlaceholder: 'What’s the concept?',
    pillarLabel: 'Pillar',
    notesLabel: 'Notes',
    notesPlaceholder: 'Hooks, angles, references, anything…',
    none: 'None',
    cancel: 'Cancel',
    create: 'Create idea',
    creating: 'Creating…',
    save: 'Save changes',
    saving: 'Saving…',
  },
  newPage: {
    title: 'New idea',
    subtitle: 'Capture it once. You can spawn content items from it on the next page.',
  },
  detail: {
    title: 'Edit idea',
    subtitle: 'Edit the idea, spawn new content items, and see what came from it.',
    backToList: '← Back to ideas',
    notFound: 'This idea doesn’t exist or you don’t have access.',
    deleteButton: 'Delete',
    deleteSectionTitle: 'Danger zone',
  },
  spawn: {
    headingFirst: 'Spawn content items from this idea',
    headingMore: 'Spawn more siblings',
    intro:
      'Turn this idea into multiple content items. Pick the formats you want and we’ll create them all linked together as siblings.',
    hubNote: 'The first item is the hub — others link to it as siblings.',
    hubPill: 'Hub',
    itemLabel: (index: number) => `Item ${index + 1}`,
    specTitleLabel: 'Title (optional)',
    specTitlePlaceholder: 'Defaults to the idea title',
    specFormatLabel: 'Format',
    specPlatformLabel: 'Platform',
    specPillarLabel: 'Pillar',
    addRow: '+ Add another item',
    removeRow: 'Remove',
    removeRowAria: (index: number) => `Remove item ${index + 1}`,
    cancel: 'Reset',
    submit: (n: number) => `Spawn ${n} items`,
    submitting: 'Spawning…',
    alertTitle: 'We couldn’t spawn those items.',
  },
  suggestAi: {
    button: 'Suggest formats with AI',
    dialogTitle: 'Suggest sibling formats',
    dialogBody:
      'We’ll use your brand context to suggest a mix of platforms and formats. You can edit everything before spawning.',
    countLabel: 'How many suggestions?',
    submit: 'Suggest',
    busy: 'Generating…',
    cancel: 'Cancel',
    disabledNoContext: 'Add at least one brand context file to enable AI suggestions.',
    alertTitle: 'We couldn’t generate suggestions.',
    success: (n: number) => `Filled ${n} suggestion${n === 1 ? '' : 's'} — review and edit before spawning.`,
  },
  spawned: {
    heading: 'Content items from this idea',
    emptyTitle: 'No content items yet',
    emptyBody: 'No content items yet. Use the panel above to spawn some.',
    starGroupLabel: (index: number) => (index === 0 ? 'Sibling group' : `Sibling group ${index + 1}`),
    hubLabel: 'Hub',
    loadError: 'We couldn’t load the content items spawned from this idea.',
  },
  delete: {
    title: 'Delete this idea?',
    body:
      'Delete this idea? The content items it spawned will keep existing — but they’ll no longer be linked back to this idea. The sibling relationships between them stay intact.',
    confirm: 'Delete',
    confirming: 'Deleting…',
    cancel: 'Cancel',
  },
  toasts: {
    created: 'Idea created.',
    updated: 'Changes saved.',
    deleted: 'Idea deleted.',
    spawned: (n: number) => `Created ${n} content items as siblings.`,
  },
} as const;

// Partial: not every code has idea-specific copy; the rest fall back generically.
const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.VALIDATION_FAILED]: 'Please check the form and try again.',
  [ERROR_CODES.NOT_FOUND]: 'This idea doesn’t exist or you don’t have access.',
  [ERROR_CODES.INVALID_RESPONSE]: 'The server returned unexpected data. Try again.',
  [ERROR_CODES.NOT_AUTHENTICATED]: 'Please sign in again.',
  // AI suggestion errors (Chunk 11) — distinct copy so the user knows what to do.
  [ERROR_CODES.RATE_LIMITED]: 'You’ve reached the AI usage limit. Try again later.',
  [ERROR_CODES.AI_TIMEOUT]: 'The AI took too long. Try again.',
  [ERROR_CODES.AI_RESPONSE_INVALID]: 'The AI returned an unexpected response. Try again.',
  [ERROR_CODES.AI_UPSTREAM_ERROR]: 'The AI service had a problem. Try again shortly.',
  [ERROR_CODES.CONFIGURATION_ERROR]: 'AI isn’t configured right now. Contact support.',
};

export function ideaErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'We couldn’t complete that. Try again.';
}
