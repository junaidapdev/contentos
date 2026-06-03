import { useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SkeletonList } from '@/components/feedback';
import { usePlatforms } from '@/features/platforms/usePlatforms';
import type { ContentItem } from '@shared/schemas/content-item';
import { AddRepurposedChildrenDialog } from './AddRepurposedChildrenDialog';
import { RepurposeChildrenList } from './RepurposeChildrenList';
import { RepurposeParentBlock } from './RepurposeParentBlock';
import { useRepurposeChain } from './useRepurposeChain';
import { contentItemMessages } from './messages';

interface RepurposePanelProps {
  item: ContentItem;
}

function PanelSkeleton() {
  return <SkeletonList rowCount={2} rowHeight="h-[64px]" />;
}

// Heading adapts to the topology relative to the current item:
//   - parent only (this item is a parent, no parent of its own)            → "Repurposed into"
//   - child only (this item is a child, no children of its own)            → "Repurposed from"
//   - both (this item is in the middle of a chain — parent AND children)   → "In a repurposing chain"
//   - neither                                                              → "Repurposing" (empty state)
function headingFor(hasParent: boolean, hasChildren: boolean): string {
  const m = contentItemMessages.repurpose.panel;
  if (hasParent && hasChildren) return m.titleChain;
  if (hasParent) return m.titleChildOnly;
  if (hasChildren) return m.titleParentOnly;
  return m.titleDefault;
}

export function RepurposePanel({ item }: RepurposePanelProps) {
  const m = contentItemMessages.repurpose.panel;
  const chainQuery = useRepurposeChain(item.id);
  const platformsQuery = usePlatforms();
  const platformLabels = useMemo(
    () => new Map((platformsQuery.data ?? []).map((p) => [p.id, p.display_name])),
    [platformsQuery.data],
  );

  const [dialogOpen, setDialogOpen] = useState(false);

  const parent = chainQuery.data?.parent ?? null;
  const children = chainQuery.data?.children ?? [];
  const hasParent = parent !== null;
  const hasChildren = children.length > 0;
  const isEmpty = !hasParent && !hasChildren;
  const heading = headingFor(hasParent, hasChildren);

  return (
    <section aria-labelledby="repurpose-heading" className="space-y-3">
      <h2 id="repurpose-heading" className="text-lg font-semibold">
        {heading}
      </h2>

      {chainQuery.isPending && <PanelSkeleton />}

      {chainQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>{m.loadError}</AlertDescription>
        </Alert>
      )}

      {chainQuery.isSuccess && (
        <>
          {hasParent && (
            <RepurposeParentBlock
              parent={parent}
              platformLabel={
                parent.platform_id ? (platformLabels.get(parent.platform_id) ?? null) : null
              }
            />
          )}

          {hasChildren ? (
            <RepurposeChildrenList
              children={children}
              platformLabels={platformLabels}
              onAddMore={() => {
                setDialogOpen(true);
              }}
              canAddMore
            />
          ) : (
            isEmpty && (
              <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center">
                <p className="text-sm font-medium">{m.empty}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.emptyBody}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setDialogOpen(true);
                  }}
                >
                  {m.emptyCta}
                </Button>
              </div>
            )
          )}

          {/* Middle-of-chain: panel already shows parent at top + children below; the
              RepurposeChildrenList's own "+ Add more" button handles further adds. No separate CTA
              needed here. */}
        </>
      )}

      <AddRepurposedChildrenDialog
        parentItemId={item.id}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </section>
  );
}
