import { Link } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';
import { StatusBadge } from '@/features/content-items/StatusBadge';
import type { CalendarChipItem } from './calendar-grouping';
import { formatShortDate, formatTime, toLocalDayKey } from './calendar-date-utils';
import { calendarMessages } from './messages';

interface CalendarAgendaProps {
  items: CalendarChipItem[]; // already sorted chronologically by sortAgendaItems()
  platformLabels: Map<string, string>;
  pillarLabels: Map<string, string>;
}

// Flat chronological list grouped by day. Companion to the grid; keyboard-friendly and
// screen-reader-friendly. Day headers carry an item count; rows show time + title + status
// + platform + pillar. Each row links to the item's detail page.
export function CalendarAgenda({ items, platformLabels, pillarLabels }: CalendarAgendaProps) {
  const m = calendarMessages.agenda;

  if (items.length === 0) {
    return (
      <section aria-labelledby="calendar-agenda-heading" className="space-y-2">
        <h2 id="calendar-agenda-heading" className="text-base font-semibold">
          {m.heading}
        </h2>
        <p className="text-sm text-muted-foreground">{m.empty}</p>
      </section>
    );
  }

  // Group again by day for the agenda's day headers. The flat list is already chronological so
  // groups are contiguous; this is a single linear pass.
  const days: { dayKey: string; date: Date; rows: CalendarChipItem[] }[] = [];
  let current: { dayKey: string; date: Date; rows: CalendarChipItem[] } | null = null;
  for (const item of items) {
    const key = toLocalDayKey(item.renderedAt);
    if (!current || current.dayKey !== key) {
      current = { dayKey: key, date: item.renderedAt, rows: [item] };
      days.push(current);
    } else {
      current.rows.push(item);
    }
  }

  return (
    <section aria-labelledby="calendar-agenda-heading" className="space-y-3">
      <h2 id="calendar-agenda-heading" className="text-base font-semibold">
        {m.heading}
      </h2>
      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.dayKey} className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {m.dayHeader(formatShortDate(day.date), day.rows.length)}
            </p>
            <ul className="space-y-1">
              {day.rows.map((item) => {
                const platformLabel = item.platform_id
                  ? (platformLabels.get(item.platform_id) ?? null)
                  : null;
                const pillarLabel = item.pillar_id
                  ? (pillarLabels.get(item.pillar_id) ?? null)
                  : null;
                return (
                  <li key={item.id}>
                    <Link
                      to={ROUTES.contentItemDetail(item.id)}
                      className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
                        {formatTime(item.renderedAt)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {platformLabel ?? '—'}
                          {pillarLabel && ` · ${pillarLabel}`}
                        </span>
                      </span>
                      <StatusBadge status={item.status} className="shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
