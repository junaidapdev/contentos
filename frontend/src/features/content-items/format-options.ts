import { CONTENT_ITEM_FORMAT_VALUES, type ContentItemFormat } from '@shared/schemas/content-item';

export const FORMAT_LABELS: Record<ContentItemFormat, string> = {
  post: 'Post',
  thread: 'Thread',
  reel: 'Reel',
  short: 'Short',
  video: 'Video',
  newsletter: 'Newsletter',
  blog_post: 'Blog post',
  story: 'Story',
  other: 'Other',
};

export const FORMAT_OPTIONS = CONTENT_ITEM_FORMAT_VALUES.map((value) => ({
  value,
  label: FORMAT_LABELS[value],
}));
