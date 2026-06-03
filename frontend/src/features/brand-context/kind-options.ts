import {
  BRAND_CONTEXT_KIND_ORDER,
  type BrandContextKind,
} from '@shared/schemas/brand-context-file';

export const KIND_LABELS: Record<BrandContextKind, string> = {
  voice: 'Voice',
  audience: 'Audience',
  offers: 'Offers',
  platform_rules: 'Platform rules',
  do_dont: "Do's & Don'ts",
  examples: 'Examples',
  other: 'Other',
};

export const KIND_DESCRIPTIONS: Record<BrandContextKind, string> = {
  voice: 'How you sound. Tone, cadence, signature phrases, things you avoid saying.',
  audience: 'Who you are speaking to. Their context, pain points, what they care about.',
  offers: 'What you sell or offer. Products, services, lead magnets, calls to action.',
  platform_rules: 'Platform-specific rules. Length, hashtags, scheduling habits.',
  do_dont: "Brand do's and don'ts. Topics you cover, topics you avoid.",
  examples: 'Examples of content that worked. Paste in past posts you would do again.',
  other: 'Anything else worth carrying with you.',
};

export const KIND_OPTIONS = BRAND_CONTEXT_KIND_ORDER.map((k) => ({
  value: k,
  label: KIND_LABELS[k],
}));
