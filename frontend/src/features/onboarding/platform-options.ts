import { PLATFORM_SLUG_VALUES, type PlatformSlug } from '@shared/schemas/platform';

// User-facing labels for each platform slug (slugs are the canonical DB values from @shared).
export const PLATFORM_LABELS: Record<PlatformSlug, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  substack: 'Substack',
  blog: 'Blog',
  tiktok: 'TikTok',
  threads: 'Threads',
  newsletter: 'Newsletter',
};

export const PLATFORM_OPTIONS: ReadonlyArray<{ slug: PlatformSlug; label: string }> =
  PLATFORM_SLUG_VALUES.map((slug) => ({ slug, label: PLATFORM_LABELS[slug] }));
