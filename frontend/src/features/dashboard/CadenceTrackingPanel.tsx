import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { SkeletonList } from '@/components/feedback';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import type { ContentItemListRow } from '@shared/schemas/content-item';
import type { Platform } from '@shared/schemas/platform';
import type { CadenceTarget } from '@shared/schemas/cadence-target';
import { PanelCard } from './PanelCard';
import {
  CADENCE_INDICATOR_CLASSES,
} from './dashboard-constants';
import { computeCadence, type CadenceState } from './dashboard-aggregations';
import { dashboardMessages } from './messages';

interface CadenceTrackingPanelProps {
  rows: ContentItemListRow[] | undefined;
  targets: CadenceTarget[] | undefined;
  platforms: Platform[] | undefined;
  days: number;
  isLoading: boolean;
}

const STATE_LABELS: Record<CadenceState, string> = {
  on_target: dashboardMessages.panels.cadence.onTarget,
  under: dashboardMessages.panels.cadence.under,
  over: dashboardMessages.panels.cadence.over,
  untracked: dashboardMessages.panels.cadence.untracked,
};

// Round at the cadence boundary, not at the formatter, so the delta sign matches the rounded
// value the user sees.
function formatPerWeek(value: number): string {
  return value.toFixed(2);
}

function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

export function CadenceTrackingPanel({
  rows,
  targets,
  platforms,
  days,
  isLoading,
}: CadenceTrackingPanelProps) {
  const m = dashboardMessages.panels.cadence;
  const data = useMemo(
    () => (rows && targets && platforms ? computeCadence(rows, targets, platforms, days) : []),
    [rows, targets, platforms, days],
  );

  if (isLoading) {
    return (
      <PanelCard title={m.title} help={m.help}>
        <SkeletonList rowCount={4} rowHeight="h-10" />
      </PanelCard>
    );
  }

  if (data.length === 0) {
    return (
      <PanelCard title={m.title} help={m.help}>
        <p className="text-sm text-muted-foreground">{m.noTargets}</p>
      </PanelCard>
    );
  }

  return (
    <PanelCard title={m.title} help={m.help}>
      {/* Desktop: proper table semantics. Mobile: same DOM but each row visually stacks. */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2 text-left font-medium">{m.headerPlatform}</th>
              <th className="px-2 py-2 text-right font-medium">{m.headerTarget}</th>
              <th className="px-2 py-2 text-right font-medium">{m.headerActual}</th>
              <th className="px-2 py-2 text-right font-medium">{m.headerDelta}</th>
              <th className="px-2 py-2 text-left font-medium">{m.headerState}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.platformId} className="border-b last:border-0">
                <td className="px-2 py-2">
                  <Link
                    to={`${ROUTES.CONTENT_ITEMS}?platform=${row.platformId}`}
                    className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={m.rowLinkAria(row.platformName)}
                  >
                    {row.platformName}
                  </Link>
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">
                  {row.targetPerWeek}
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">
                  {formatPerWeek(row.actualPerWeek)}
                </td>
                <td
                  className={cn(
                    'px-2 py-2 text-right font-mono tabular-nums',
                    row.state === 'over' && 'text-sky-700',
                    row.state === 'under' && 'text-amber-700',
                    row.state === 'on_target' && 'text-emerald-700',
                  )}
                >
                  {formatDelta(row.delta)}
                </td>
                <td className="px-2 py-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      CADENCE_INDICATOR_CLASSES[row.state],
                    )}
                  >
                    {STATE_LABELS[row.state]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelCard>
  );
}
