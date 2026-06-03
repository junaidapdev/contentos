import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import type { ContentItemListRow } from '@shared/schemas/content-item';
import type { ContentPillar } from '@shared/schemas/content-pillar';
import type { Platform } from '@shared/schemas/platform';
import { PanelCard } from './PanelCard';
import { computeTopEmptyCells } from './dashboard-aggregations';
import { TOP_EMPTY_CELLS_LIMIT } from './dashboard-constants';
import { dashboardMessages } from './messages';

interface TopEmptyCellsPanelProps {
  rows: ContentItemListRow[] | undefined;
  pillars: ContentPillar[] | undefined;
  platforms: Platform[] | undefined;
  isLoading: boolean;
}

// Each empty cell links to /content-items/new with pre-filled pillar_id + platform_id query
// params. The Chunk 04 form was patched in Chunk 09 to read these defaults (see
// NewContentItemPage.tsx + ContentItemForm.tsx).
export function TopEmptyCellsPanel({
  rows,
  pillars,
  platforms,
  isLoading,
}: TopEmptyCellsPanelProps) {
  const m = dashboardMessages.panels.emptyCells;
  const data = useMemo(
    () =>
      rows && pillars && platforms
        ? computeTopEmptyCells(rows, pillars, platforms, TOP_EMPTY_CELLS_LIMIT)
        : [],
    [rows, pillars, platforms],
  );

  if (isLoading) {
    return (
      <PanelCard title={m.title} help={m.help}>
        <Skeleton className="h-24 w-full" />
      </PanelCard>
    );
  }

  if (data.length === 0) {
    return (
      <PanelCard title={m.title} help={m.help}>
        <p className="text-sm text-muted-foreground">{m.none}</p>
      </PanelCard>
    );
  }

  return (
    <PanelCard title={m.title} help={m.help}>
      <ul className="divide-y">
        {data.map((cell) => {
          const href = `${ROUTES.CONTENT_ITEM_NEW}?pillar_id=${cell.pillarId}&platform_id=${cell.platformId}`;
          return (
            <li key={`${cell.pillarId}|${cell.platformId}`}>
              <Link
                to={href}
                aria-label={m.rowLinkAria(cell.pillarName, cell.platformName)}
                className="group flex items-center justify-between gap-3 py-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{cell.pillarName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {cell.platformName}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <span className="inline-flex items-center gap-1">
                    <PlusIcon className="size-3" aria-hidden="true" />
                    {m.cta}
                  </span>
                </Button>
              </Link>
            </li>
          );
        })}
      </ul>
    </PanelCard>
  );
}
