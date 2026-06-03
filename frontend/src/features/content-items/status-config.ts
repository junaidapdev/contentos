import {
  CONTENT_ITEM_STATUS_TRANSITIONS,
  type ContentItemStatus,
} from '@shared/schemas/content-item';

export const STATUS_LABELS: Record<ContentItemStatus, string> = {
  idea: 'Idea',
  drafting: 'Drafting',
  ready: 'Ready',
  scheduled: 'Scheduled',
  published: 'Published',
};

// Tailwind classes referencing the status design tokens (@theme in src/index.css). No hardcoded hex.
export const STATUS_CLASSES: Record<ContentItemStatus, string> = {
  idea: 'bg-status-idea/10 text-status-idea ring-1 ring-status-idea/20',
  drafting: 'bg-status-drafting/10 text-status-drafting ring-1 ring-status-drafting/20',
  ready: 'bg-status-ready/10 text-status-ready ring-1 ring-status-ready/20',
  scheduled: 'bg-status-scheduled/10 text-status-scheduled ring-1 ring-status-scheduled/20',
  published: 'bg-status-published/10 text-status-published ring-1 ring-status-published/20',
};

export const NEXT_ALLOWED_STATUSES = CONTENT_ITEM_STATUS_TRANSITIONS;
