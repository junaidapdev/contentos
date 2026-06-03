import type { BrandContextKind } from '@shared/schemas/brand-context-file';

// Bump only on a BREAKING format change. Readers (Chunk 11's Anthropic proxy, any future
// pack-import feature) key compatibility off this string in the header comment.
export const PACK_VERSION = 'v1';

// Hard cap on the assembled pack. Even the most expansive context shouldn't blow past common LLM
// context windows when pasted alongside a user message. Over this, buildPack truncates the tail
// and appends a clearly-marked footer.
export const PACK_MAX_CHARS = 100_000;

// Section headings keyed by kind. Typed against BrandContextKind so adding a kind upstream forces
// a heading here (no orphan kinds).
export const PACK_KIND_HEADINGS: Record<BrandContextKind, string> = {
  voice: '## Voice',
  audience: '## Audience',
  offers: '## Offers',
  platform_rules: '## Platform rules',
  do_dont: "## Do's & Don'ts",
  examples: '## Examples',
  other: '## Other context',
};

export const PACK_EXAMPLES_HEADING = '## Recent published examples';
export const PACK_IDEA_HEADING = '## This idea';

export const PACK_HEADER_TEMPLATE = (date: string): string =>
  `<!-- content-engine-pack ${PACK_VERSION} / generated ${date} -->`;

// Download filename: content-engine-pack-YYYY-MM-DD.md
export const PACK_DOWNLOAD_FILENAME = (date: string): string => `content-engine-pack-${date}.md`;
