import { SparklesIcon } from 'lucide-react';

import { EmptyState } from '@/components/feedback';
import { ROUTES } from '@/constants/routes';
import { dashboardMessages } from './messages';

// Shown when the user has zero content items overall (not just zero in window). A first-run
// experience that nudges the creator into the two primary creation flows: capture an idea or
// create a content item directly.
//
// This is the documented exception to the "exactly one primary CTA" rule (see decisions.md
// chunk-12). Dashboard first-run genuinely has two equal next-steps for the creator; the
// shared <EmptyState> uses the primary + secondary button pattern to make the primary action
// (creating a content item directly) the dominant one and the idea-capture the alternate.
export function DashboardEmptyState() {
  const m = dashboardMessages.firstRun;
  return (
    <EmptyState
      icon={<SparklesIcon className="size-8" aria-hidden="true" />}
      title={m.title}
      body={m.body}
      primaryCta={{ label: m.ctaItem, to: ROUTES.CONTENT_ITEM_NEW }}
      secondaryCta={{ label: m.ctaIdea, to: ROUTES.IDEA_NEW }}
    />
  );
}
