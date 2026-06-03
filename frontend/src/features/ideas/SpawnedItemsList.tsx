import { Link } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { SkeletonList } from '@/components/feedback';
import { ROUTES } from '@/constants/routes';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import { FORMAT_LABELS } from '@/features/content-items/format-options';
import { StatusBadge } from '@/features/content-items/StatusBadge';
import type { ContentItem } from '@shared/schemas/content-item';
import { useIdeaSpawnedItems, type SpawnedItemsResult } from './useIdeaSpawnedItems';
import { ideaMessages } from './messages';

interface SpawnedItemsListProps {
  ideaId: string;
}

interface ItemRowProps {
  item: ContentItem;
  platformLabel: string | null;
  isHub?: boolean;
}

function ItemRow({ item, platformLabel, isHub = false }: ItemRowProps) {
  const dash = ideaMessages.list.dash;
  return (
    <Link
      to={ROUTES.contentItemDetail(item.id)}
      className="flex items-start justify-between gap-3 rounded-md border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {FORMAT_LABELS[item.format]} · {platformLabel ?? dash}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isHub && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {ideaMessages.spawned.hubLabel}
          </span>
        )}
        <StatusBadge status={item.status} />
      </div>
    </Link>
  );
}

function ListSkeleton() {
  return <SkeletonList rowCount={3} rowHeight="h-[56px]" />;
}

function EmptyState() {
  const m = ideaMessages.spawned;
  return (
    <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center">
      <p className="text-sm font-medium">{m.emptyTitle}</p>
      <p className="mt-1 text-xs text-muted-foreground">{m.emptyBody}</p>
    </div>
  );
}

interface BodyProps {
  data: SpawnedItemsResult;
  platformLabels: Map<string, string>;
}

function Body({ data, platformLabels }: BodyProps) {
  const m = ideaMessages.spawned;
  if (data.allItems.length === 0) {
    return <EmptyState />;
  }
  const labelFor = (item: ContentItem): string | null =>
    item.platform_id ? (platformLabels.get(item.platform_id) ?? null) : null;

  return (
    <div className="space-y-4">
      {data.stars.map((star, index) => (
        <div key={star.hub.id} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {m.starGroupLabel(index)}
          </p>
          <div className="space-y-2">
            <ItemRow item={star.hub} platformLabel={labelFor(star.hub)} isHub />
            {star.spokes.map((spoke) => (
              <ItemRow key={spoke.id} item={spoke} platformLabel={labelFor(spoke)} />
            ))}
          </div>
        </div>
      ))}

      {data.loneItems.length > 0 && (
        <div className="space-y-2">
          {data.stars.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Other items
            </p>
          )}
          <div className="space-y-2">
            {data.loneItems.map((item) => (
              <ItemRow key={item.id} item={item} platformLabel={labelFor(item)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SpawnedItemsList({ ideaId }: SpawnedItemsListProps) {
  const m = ideaMessages.spawned;
  const query = useIdeaSpawnedItems(ideaId);
  const platforms = usePlatforms().data ?? [];
  const platformLabels = new Map(platforms.map((p) => [p.id, p.display_name]));

  return (
    <section aria-labelledby="spawned-items-heading" className="space-y-3">
      <h2 id="spawned-items-heading" className="text-lg font-semibold">
        {m.heading}
      </h2>

      {query.isPending && <ListSkeleton />}

      {query.isError && (
        <Alert variant="destructive">
          <AlertDescription>{m.loadError}</AlertDescription>
        </Alert>
      )}

      {query.isSuccess && <Body data={query.data} platformLabels={platformLabels} />}
    </section>
  );
}
