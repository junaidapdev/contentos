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
import type { ContentItemListRow } from '@shared/schemas/content-item';
import { CONTENT_ITEM_STATUS_VALUES } from '@shared/schemas/content-item';
import { STATUS_LABELS } from '@/features/content-items/status-config';
import { PanelCard } from './PanelCard';
import { computeStatusMix } from './dashboard-aggregations';
import { STATUS_MIX_COLORS } from './dashboard-constants';
import { dashboardMessages } from './messages';

interface StatusMixPanelProps {
  rows: ContentItemListRow[] | undefined;
  windowStart: Date | undefined;
  isLoading: boolean;
}

// Recharts stacks segments side-by-side when given multiple <Bar>s sharing the same `stackId`.
// The data shape is a single object with one key per status; each <Bar> reads its own key.
interface StackPayloadEntry {
  dataKey?: string;
  value?: number;
  color?: string;
}

function StackTooltip({
  active,
  payload,
  total,
  tooltipFor,
}: {
  active?: boolean;
  payload?: ReadonlyArray<StackPayloadEntry>;
  total: number;
  tooltipFor: (label: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-sm">
      {payload.map((entry) => {
        if (!entry.dataKey || entry.value === undefined) return null;
        const label = STATUS_LABELS[entry.dataKey as keyof typeof STATUS_LABELS];
        if (!label) return null;
        const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
        return (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-2 rounded-sm"
              style={{ background: entry.color }}
            />
            <span className="font-medium">{tooltipFor(label)}</span>
            <span className="ml-auto text-muted-foreground">
              {entry.value} · {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function StatusMixPanel({ rows, windowStart, isLoading }: StatusMixPanelProps) {
  const m = dashboardMessages.panels.statusMix;

  const mix = useMemo(
    () => (rows && windowStart ? computeStatusMix(rows, windowStart) : []),
    [rows, windowStart],
  );
  const total = mix.reduce((sum, r) => sum + r.count, 0);

  // Recharts wants one data row per bar group. We render a single horizontal stacked bar, so a
  // one-element array with each status as a separate key works cleanly.
  const chartData = useMemo(() => {
    if (mix.length === 0) return [];
    const entry: Record<string, number> = {};
    for (const row of mix) entry[row.status] = row.count;
    return [entry];
  }, [mix]);

  if (isLoading) {
    return (
      <PanelCard title={m.title} help={m.help}>
        <Skeleton className="h-24 w-full" />
      </PanelCard>
    );
  }

  if (total === 0) {
    return (
      <PanelCard title={m.title} help={m.help}>
        <p className="text-sm text-muted-foreground">{m.empty}</p>
      </PanelCard>
    );
  }

  return (
    <PanelCard title={m.title} help={m.help}>
      <div role="img" aria-label={m.chartAriaLabel} style={{ height: 96 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 16, bottom: 10, left: 0 }}
            barCategoryGap={0}
          >
            <XAxis type="number" hide domain={[0, total]} />
            <YAxis type="category" dataKey="_label" hide />
            <RechartsTooltip
              content={<StackTooltip total={total} tooltipFor={m.tooltipFor} />}
              cursor={{ fill: 'transparent' }}
            />
            {CONTENT_ITEM_STATUS_VALUES.map((status) => (
              <Bar
                key={status}
                dataKey={status}
                stackId="status"
                fill={STATUS_MIX_COLORS[status]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend underneath — colored dot + label + count. Reuses the status color tokens so the
          legend matches the chart segments exactly. */}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {mix.map((row) => (
          <li key={row.status} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block size-2 rounded-sm"
              style={{ background: STATUS_MIX_COLORS[row.status] }}
            />
            <span className="font-medium">{STATUS_LABELS[row.status]}</span>
            <span className="text-muted-foreground">{row.count}</span>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}
