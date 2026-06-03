import { Link } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { SkeletonList } from '@/components/feedback';
import { ROUTES } from '@/constants/routes';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import type { ContentItem } from '@shared/schemas/content-item';
import { FORMAT_LABELS } from './format-options';
import { StatusBadge } from './StatusBadge';
import { useContentItemSiblings } from './useContentItemSiblings';
import { contentItemMessages } from './messages';

interface ContentItemSiblingsPanelProps {
  itemId: string;
}

function SiblingRow({ item, platformLabel }: { item: ContentItem; platformLabel: string | null }) {
  const dash = contentItemMessages.list.dash;
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
      <StatusBadge status={item.status} />
    </Link>
  );
}

export function ContentItemSiblingsPanel({ itemId }: ContentItemSiblingsPanelProps) {
  const m = contentItemMessages.siblings;
  const siblingsQuery = useContentItemSiblings(itemId);
  const platforms = usePlatforms().data ?? [];
  const platformLabels = new Map(platforms.map((p) => [p.id, p.display_name]));

  return (
    <section aria-labelledby="content-item-siblings-heading" className="space-y-3">
      <h2 id="content-item-siblings-heading" className="text-lg font-semibold">
        {m.heading}
      </h2>

      {siblingsQuery.isPending && <SkeletonList rowCount={2} rowHeight="h-[56px]" />}

      {siblingsQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>{m.loadError}</AlertDescription>
        </Alert>
      )}

      {siblingsQuery.isSuccess && siblingsQuery.data.length === 0 && (
        <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center">
          <p className="text-sm font-medium">{m.emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{m.emptyBody}</p>
        </div>
      )}

      {siblingsQuery.isSuccess && siblingsQuery.data.length > 0 && (
        <div className="space-y-2">
          {siblingsQuery.data.map((sibling) => (
            <SiblingRow
              key={sibling.id}
              item={sibling}
              platformLabel={
                sibling.platform_id ? (platformLabels.get(sibling.platform_id) ?? null) : null
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
