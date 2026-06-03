import { CalendarOffIcon } from 'lucide-react';

import { EmptyState } from '@/components/feedback';
import { ROUTES } from '@/constants/routes';
import { calendarMessages } from './messages';

interface CalendarEmptyStateProps {
  hasFilters: boolean;
}

export function CalendarEmptyState({ hasFilters }: CalendarEmptyStateProps) {
  const m = calendarMessages.empty;
  // EmptyState's `primaryCta` is an optional prop (exactOptionalPropertyTypes is on), so we
  // either include it or omit the key entirely — passing `undefined` would not satisfy the type.
  const ctaProps = hasFilters
    ? {}
    : { primaryCta: { label: m.ctaNoFilters, to: ROUTES.CONTENT_ITEMS } };
  return (
    <EmptyState
      icon={<CalendarOffIcon className="size-8" aria-hidden="true" />}
      title={hasFilters ? m.titleFiltered : m.titleNoFilters}
      body={hasFilters ? m.bodyFiltered : m.bodyNoFilters}
      {...ctaProps}
    />
  );
}
