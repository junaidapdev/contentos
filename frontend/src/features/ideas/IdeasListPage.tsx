import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LightbulbIcon } from 'lucide-react';

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
import { usePillars } from '@/features/pillars/usePillars';
import { useIdeasList } from './useIdeasList';
import { useIdeasSpawnedCounts } from './useIdeasSpawnedCounts';
import { IdeaListRow } from './IdeaListRow';
import { ideaMessages } from './messages';

export function IdeasListPage() {
  const navigate = useNavigate();
  const listQuery = useIdeasList();
  const pillars = usePillars().data ?? [];

  const ideas = useMemo(() => listQuery.data?.pages.flat() ?? [], [listQuery.data]);
  const ideaIds = useMemo(() => ideas.map((idea) => idea.id), [ideas]);
  const spawnedCounts = useIdeasSpawnedCounts(ideaIds);

  const pillarLabels = new Map(pillars.map((p) => [p.id, p.name]));

  const m = ideaMessages.list;
  const goNew = (): void => {
    navigate(ROUTES.IDEA_NEW);
  };
  const retry = (): void => {
    void listQuery.refetch();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title={m.title}
        subtitle={m.subtitle}
        actions={<Button onClick={goNew}>{m.newButton}</Button>}
      />

      <div className="mt-6 space-y-3">
        {listQuery.isPending && <SkeletonList rowCount={5} />}

        {listQuery.isError &&
          (isNetworkError(listQuery.error) ? (
            <NetworkErrorState onRetry={retry} />
          ) : (
            <ErrorState title={m.loadError} body={m.errorBody} onRetry={retry} />
          ))}

        {listQuery.isSuccess && ideas.length === 0 && (
          <EmptyState
            icon={<LightbulbIcon className="size-8" aria-hidden="true" />}
            title={m.emptyTitle}
            body={m.emptyBody}
            primaryCta={{ label: m.emptyCta, onClick: goNew }}
          />
        )}

        {ideas.map((idea) => (
          <IdeaListRow
            key={idea.id}
            idea={idea}
            pillarLabel={idea.pillar_id ? (pillarLabels.get(idea.pillar_id) ?? null) : null}
            spawnedCount={spawnedCounts.get(idea.id) ?? 0}
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
