import { useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import type { ContentItem } from '@shared/schemas/content-item';
import type { Platform } from '@shared/schemas/platform';
import { AddCrossPostDialog } from './AddCrossPostDialog';
import { PlatformStatusCell } from './PlatformStatusCell';
import { useCrossPostGroup, type CrossPostGroup } from './useCrossPostGroup';
import { contentItemMessages } from './messages';

interface CrossPostGroupPanelProps {
  item: ContentItem;
}

interface GridProps {
  group: CrossPostGroup | null;
  item: ContentItem;
  activePlatforms: Platform[];
  onAddMissing: (platformId: string | null) => void;
}

// Build the per-platform grid: one cell per active platform. Each cell is either a covered variant
// or a "Missing" CTA. When the panel renders without a group (item has a platform but no
// cross-posts yet), the item itself is the only covered cell.
function PlatformGrid({ group, item, activePlatforms, onAddMissing }: GridProps) {
  const variants = group?.variants ?? [item];
  const sourceId = group?.sourceItem.id ?? item.id;
  const variantByPlatform = new Map<string, ContentItem>();
  for (const v of variants) {
    if (v.platform_id) variantByPlatform.set(v.platform_id, v);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {activePlatforms.map((platform) => {
        const variant = variantByPlatform.get(platform.id);
        if (variant) {
          return (
            <PlatformStatusCell
              key={platform.id}
              platformLabel={platform.display_name}
              variant={variant}
              isSource={variant.id === sourceId}
            />
          );
        }
        return (
          <PlatformStatusCell
            key={platform.id}
            platformLabel={platform.display_name}
            isMissing
            onAddMissing={() => {
              onAddMissing(platform.id);
            }}
          />
        );
      })}
    </div>
  );
}

// The cross-post panel renders a grid of platform cells rather than a vertical list. The
// shared SkeletonList wraps items in a flex column and would collapse the grid layout — so we
// keep a small grid-shaped skeleton inline here. Documented exception in decisions.md.
function PanelSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: 3 }).map((_unused, index) => (
        <Skeleton key={index} className="h-[78px] w-full rounded-md" />
      ))}
    </div>
  );
}

export function CrossPostGroupPanel({ item }: CrossPostGroupPanelProps) {
  const m = contentItemMessages.crossPost.panel;
  const platformsQuery = usePlatforms();
  // Stabilize via useMemo so the data reference is the same between renders unless the underlying
  // query result changes. Downstream useMemos can then key on it without re-firing every render.
  const activePlatforms = useMemo<Platform[]>(
    () => platformsQuery.data ?? [],
    [platformsQuery.data],
  );
  const groupQuery = useCrossPostGroup(item.id, platformsQuery.data);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [preSelectedPlatformId, setPreSelectedPlatformId] = useState<string | null>(null);

  // Source for the spawn RPC: when a cross-post group exists, source is the group's hub. When it
  // doesn't, source is the current item (which becomes the hub of a new group on first spawn).
  const sourceItemId = useMemo(
    () => groupQuery.data?.sourceItem.id ?? item.id,
    [groupQuery.data?.sourceItem.id, item.id],
  );

  // Available platforms for the dialog: every active platform that isn't already covered AND isn't
  // the source's own platform.
  const availablePlatforms = useMemo(() => {
    const covered = new Set<string>(
      (groupQuery.data?.variants ?? [item])
        .map((v) => v.platform_id)
        .filter((p): p is string => p !== null),
    );
    return activePlatforms.filter((p) => !covered.has(p.id));
  }, [groupQuery.data?.variants, activePlatforms, item]);

  // Early-out states tied to the item / user setup. These come BEFORE the data branches so the
  // panel can render meaningful guidance even when groupQuery is pending.
  if (item.platform_id === null) {
    return (
      <section aria-labelledby="cross-post-heading" className="space-y-2">
        <h2 id="cross-post-heading" className="text-lg font-semibold">
          {m.heading}
        </h2>
        <p className="text-sm text-muted-foreground">{m.requiresPlatform}</p>
      </section>
    );
  }
  if (activePlatforms.length < 2) {
    return (
      <section aria-labelledby="cross-post-heading" className="space-y-2">
        <h2 id="cross-post-heading" className="text-lg font-semibold">
          {m.heading}
        </h2>
        <p className="text-sm text-muted-foreground">{m.requiresMultiplePlatforms}</p>
      </section>
    );
  }

  const openDialog = (platformId: string | null): void => {
    setPreSelectedPlatformId(platformId);
    setDialogOpen(true);
  };

  const group = groupQuery.data ?? null;
  // Coverage ratio for the header line. When no group exists, the item itself counts as 1 covered.
  const coveredCount = group ? group.variants.length : 1;
  const totalCount = activePlatforms.length;

  return (
    <section aria-labelledby="cross-post-heading" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="cross-post-heading" className="text-lg font-semibold">
            {m.heading}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {m.subtitle(coveredCount, totalCount)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={availablePlatforms.length === 0}
          onClick={() => {
            openDialog(null);
          }}
        >
          {m.addCta}
        </Button>
      </div>

      {!group && groupQuery.isSuccess && (
        <p className="text-sm text-muted-foreground">{m.empty}</p>
      )}

      {groupQuery.isPending && <PanelSkeleton />}

      {groupQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>{m.loadError}</AlertDescription>
        </Alert>
      )}

      {groupQuery.isSuccess && (
        <PlatformGrid
          group={group}
          item={item}
          activePlatforms={activePlatforms}
          onAddMissing={openDialog}
        />
      )}

      <AddCrossPostDialog
        sourceItemId={sourceItemId}
        availablePlatforms={availablePlatforms}
        preSelectedPlatformId={preSelectedPlatformId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </section>
  );
}
