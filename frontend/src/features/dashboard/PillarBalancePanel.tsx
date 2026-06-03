import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Skeleton } from '@/components/ui/skeleton';
// Skeleton is kept here (not SkeletonList) because the panel's loading state matches the chart
// dimensions (one big rectangle), not a list. Documented exception to the shared-primitive rule.
import type { ContentItemListRow } from '@shared/schemas/content-item';
import type { ContentPillar } from '@shared/schemas/content-pillar';
import { PanelCard } from './PanelCard';
import {
  computePillarBalance,
  type PillarBalanceRow,
} from './dashboard-aggregations';
import { PILLAR_BAR_COLOR } from './dashboard-constants';
import { dashboardMessages } from './messages';

interface PillarBalancePanelProps {
  rows: ContentItemListRow[] | undefined;
  pillars: ContentPillar[] | undefined;
  isLoading: boolean;
}

// Minimal tooltip — recharts feeds an array of payload entries; we only render the first item
// (one bar per row) with its label + value. Wrapping in a typed React component keeps the
// shape under our control rather than relying on recharts' default tooltip styling.
function ChartTooltip({
  active,
  payload,
  countLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    value?: number | string;
    payload?: PillarBalanceRow;
  }>;
  countLabel: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  if (!entry?.payload) return null;
  return (
    <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm">
      <div className="font-medium">{entry.payload.pillarName}</div>
      <div className="text-muted-foreground">
        {entry.payload.count} {countLabel}
      </div>
    </div>
  );
}

export function PillarBalancePanel({
  rows,
  pillars,
  isLoading,
}: PillarBalancePanelProps) {
  const m = dashboardMessages.panels.pillarBalance;

  const data = useMemo(
    () =>
      rows && pillars
        ? computePillarBalance(rows, pillars, m.noPillarRowLabel)
        : [],
    [rows, pillars, m.noPillarRowLabel],
  );

  const totalCount = data.reduce((sum, r) => sum + r.count, 0);
  const chartHeight = Math.max(data.length * 36 + 40, 120);

  if (isLoading) {
    return (
      <PanelCard title={m.title} help={m.help}>
        <Skeleton className="h-40 w-full" />
      </PanelCard>
    );
  }

  return (
    <PanelCard title={m.title} help={m.help}>
      {totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">{m.empty}</p>
      ) : (
        <div
          role="img"
          aria-label={m.barAriaLabel}
          style={{ height: chartHeight }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 16, bottom: 5, left: 0 }}
            >
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                dataKey="pillarName"
                type="category"
                width={120}
                tick={{ fontSize: 12 }}
                stroke="var(--color-muted-foreground)"
              />
              <RechartsTooltip
                content={<ChartTooltip countLabel={m.countLabel} />}
                cursor={{ fill: 'var(--color-muted)' }}
              />
              <Bar dataKey="count" fill={PILLAR_BAR_COLOR} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PanelCard>
  );
}
