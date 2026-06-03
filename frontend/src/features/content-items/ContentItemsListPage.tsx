import { useNavigate, useSearchParams } from 'react-router-dom';
import { InboxIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  NetworkErrorState,
  PageHeader,
  SkeletonList,
} from '@/components/feedback';
import { isNetworkError } from '@/lib/network-error';
import { ROUTES } from '@/constants/routes';
import { COMMON_MESSAGES } from '@/constants/messages';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import { usePillars } from '@/features/pillars/usePillars';
import { useContentItemsList } from './useContentItemsList';
import { ContentItemFilters } from './ContentItemFilters';
import { ContentItemListRow } from './ContentItemListRow';
import { contentItemMessages } from './messages';

export function ContentItemsListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? undefined;
  const platform = params.get('platform') ?? undefined;
  const pillar = params.get('pillar') ?? undefined;
  const hasFilters = Boolean(status ?? platform ?? pillar);

  const listQuery = useContentItemsList({ status, platform_id: platform, pillar_id: pillar });
  const platforms = usePlatforms().data ?? [];
  const pillars = usePillars().data ?? [];

  const platformLabels = new Map(platforms.map((p) => [p.id, p.display_name]));
  const pillarLabels = new Map(pillars.map((p) => [p.id, p.name]));

  const items = listQuery.data?.pages.flat() ?? [];
  const m = contentItemMessages.list;
  const goNew = (): void => {
    navigate(ROUTES.CONTENT_ITEM_NEW);
  };
  const retry = (): void => {
    void listQuery.refetch();
  };
  const clearFilters = (): void => {
    setParams({});
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={m.title}
        subtitle={m.subtitle}
        actions={<Button onClick={goNew}>{m.newButton}</Button>}
      />

      <div className="mt-6">
        <ContentItemFilters />
      </div>

      <div className="mt-6 space-y-3">
        {listQuery.isPending && <SkeletonList rowCount={5} />}

        {listQuery.isError &&
          (isNetworkError(listQuery.error) ? (
            <NetworkErrorState onRetry={retry} />
          ) : (
            <ErrorState title={m.loadError} body={m.errorBody} onRetry={retry} />
          ))}

        {listQuery.isSuccess && items.length === 0 && (
          <EmptyState
            icon={<InboxIcon className="size-8" aria-hidden="true" />}
            title={hasFilters ? m.emptyFilteredTitle : m.emptyTitle}
            body={hasFilters ? m.emptyFilteredBody : m.emptyBody}
            primaryCta={
              hasFilters
                ? { label: m.clearFilters, onClick: clearFilters }
                : { label: m.emptyCta, onClick: goNew }
            }
          />
        )}

        {items.map((item) => (
          <ContentItemListRow
            key={item.id}
            item={item}
            platformLabel={item.platform_id ? (platformLabels.get(item.platform_id) ?? null) : null}
            pillarLabel={item.pillar_id ? (pillarLabels.get(item.pillar_id) ?? null) : null}
          />
        ))}

        {listQuery.hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              disabled={listQuery.isFetchingNextPage}
              onClick={() => {
                void listQuery.fetchNextPage();
              }}
            >
              {listQuery.isFetchingNextPage ? COMMON_MESSAGES.loading : m.loadMore}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
