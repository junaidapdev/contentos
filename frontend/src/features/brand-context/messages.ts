import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';

export const brandContextMessages = {
  list: {
    title: 'Brand context',
    subtitle: 'Your reusable context for AI tools. Author once, export anywhere.',
    exportButton: 'Export pack',
    newFileButton: '+ New file',
    loadError: 'We couldn’t load your brand context.',
    errorBody: 'Try again to refetch your files.',
    retry: 'Retry',
    emptyTitle: 'Your brand context library is empty.',
    emptyBody: 'Start with Voice — a short note on how you sound is the highest-leverage piece.',
    emptyCta: 'Add your first file',
    groupCount: (n: number) => `${n}`,
    groupEmpty: (description: string) => description,
    groupAddLink: (kindLabel: string) => `+ Add ${kindLabel.toLowerCase()} file`,
    fileUpdatedPrefix: 'Updated',
  },
  form: {
    kindLabel: 'Kind',
    titleLabel: 'Title',
    titlePlaceholder: 'A short name for this file',
    bodyLabel: 'Body (markdown)',
    bodyPlaceholder: 'Write in markdown. The receiving AI tool renders it.',
    bodyCounter: (count: number) => `${count.toLocaleString()} / 20,000 characters`,
    bodyWarningNearLimit: 'Approaching the 20,000-character limit.',
    cancel: 'Cancel',
    create: 'Create file',
    creating: 'Creating…',
    save: 'Save changes',
    saving: 'Saving…',
  },
  newPage: {
    title: 'New brand context file',
    subtitle: 'Author a reusable piece of context. Pick a kind, give it a title, write the body.',
  },
  detail: {
    title: 'Edit brand context file',
    subtitle: 'Edit any field. Changes save on submit.',
    backToList: '← Back to brand context',
    notFound: 'This file doesn’t exist or you don’t have access.',
    deleteButton: 'Delete',
    deleteSectionTitle: 'Danger zone',
  },
  delete: {
    title: 'Delete this file?',
    body: 'Delete this file? This cannot be undone. The file is currently selected in 0 saved export presets.',
    confirm: 'Delete',
    confirming: 'Deleting…',
    cancel: 'Cancel',
  },
  exportPage: {
    title: 'Export pack',
    subtitle: 'Pick the context to include, then copy or download.',
    backToList: '← Back to brand context',
  },
  composer: {
    filesHeading: 'Brand context files',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',
    includeExamplesLabel: 'Include recent published examples',
    examplesCountLabel: 'How many?',
    examplesPlatformLabel: 'Platform',
    examplesPillarLabel: 'Pillar',
    examplesAnyPlatform: 'Any platform',
    examplesAnyPillar: 'Any pillar',
    scopeToIdeaLabel: 'Scope to an idea',
    scopeNoIdea: 'No idea',
    summaryHeading: 'Pack summary',
    summaryFileCount: (n: number) => `${n} file${n === 1 ? '' : 's'} selected`,
    summaryCharCount: (n: number) => `${n.toLocaleString()} characters`,
    previewButton: 'Preview pack',
    copyButton: 'Copy to clipboard',
    downloadButton: 'Download .md',
    emptySelection: 'Select at least one file (or scope to an idea) to build a pack.',
    truncatedWarning:
      'Pack exceeded 100,000 characters and was truncated. Deselect some files or scope to a specific idea.',
    nearLimitWarning: 'This pack is large and may be truncated when pasted into some tools.',
  },
  preview: {
    title: 'Pack preview',
    description: 'This is exactly what will be copied or downloaded.',
    copyButton: 'Copy to clipboard',
    downloadButton: 'Download .md',
    close: 'Close',
  },
  ideaExport: {
    dialogTitle: 'Export pack for this idea',
    dialogBody:
      'We’ll include your brand context plus this idea’s notes, pillar, and spawned items.',
    triggerButton: 'Export pack for this idea',
    loadError: 'We couldn’t load this idea’s context.',
  },
  toasts: {
    created: 'Brand context file created.',
    updated: 'Changes saved.',
    deleted: 'File deleted.',
    copySuccess: 'Copied to clipboard.',
    copyFailed: 'Could not copy. You may need to grant clipboard permission.',
    downloaded: 'Pack downloaded.',
  },
} as const;

const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.VALIDATION_FAILED]: 'Please check the form and try again.',
  [ERROR_CODES.NOT_FOUND]: 'This file doesn’t exist or you don’t have access.',
  [ERROR_CODES.INVALID_RESPONSE]: 'The server returned unexpected data. Try again.',
  [ERROR_CODES.NOT_AUTHENTICATED]: 'Please sign in again.',
};

export function brandContextErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'We couldn’t complete that. Try again.';
}
