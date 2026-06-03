import { logger } from '@/lib/logger';
import type { ContentItemListRow } from '@shared/schemas/content-item';
import { toLocalDayKey } from './calendar-date-utils';

// An item enriched with its rendered date — what the calendar shows it ON, derived from the
// status: `scheduled` items render on `scheduled_for`, `published` items on `published_at`. Items
// in other statuses don't reach this stage (the window query excludes them); this type also
// drops the original `_for`/`_at` nullables in favor of a single non-null Date for the cells.
export interface CalendarChipItem extends ContentItemListRow {
  // The local Date the item renders on. The cell key is toLocalDayKey(renderedAt).
  renderedAt: Date;
}

// Bucket a flat list of items into a Map<dayKey, items[]> using the rendering rule. dayKey is the
// local-time YYYY-MM-DD (NOT UTC) so cells render items on the user's local calendar day.
// Sorting within a bucket is chronological (earlier in the day first), then by title.
//
// Defensive: if a row returns from the query in a status other than 'scheduled'/'published' (the
// query's `.in('status', filters.statuses)` is followed by a date-range OR that should already
// exclude such rows), the item is dropped with a debug log. Should never fire in practice.
export function bucketItemsByDay(items: ContentItemListRow[]): Map<string, CalendarChipItem[]> {
  const buckets = new Map<string, CalendarChipItem[]>();

  for (const item of items) {
    const dateString =
      item.status === 'scheduled'
        ? item.scheduled_for
        : item.status === 'published'
          ? item.published_at
          : null;

    if (!dateString) {
      logger.debug('calendar_bucket_skipping_item_without_date', {
        id: item.id,
        status: item.status,
      });
      continue;
    }
    const renderedAt = new Date(dateString);
    if (Number.isNaN(renderedAt.getTime())) {
      logger.debug('calendar_bucket_skipping_item_with_bad_date', { id: item.id });
      continue;
    }
    const key = toLocalDayKey(renderedAt);
    const enriched: CalendarChipItem = { ...item, renderedAt };
    const existing = buckets.get(key);
    if (existing) {
      existing.push(enriched);
    } else {
      buckets.set(key, [enriched]);
    }
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => {
      const dt = a.renderedAt.getTime() - b.renderedAt.getTime();
      if (dt !== 0) return dt;
      return a.title.localeCompare(b.title);
    });
  }

  return buckets;
}

// Flatten + chronologically sort the bucketed map. Used by the agenda panel which shows everything
// in the window as one long list grouped by day header.
export function sortAgendaItems(buckets: Map<string, CalendarChipItem[]>): CalendarChipItem[] {
  const all: CalendarChipItem[] = [];
  for (const list of buckets.values()) all.push(...list);
  all.sort((a, b) => {
    const dt = a.renderedAt.getTime() - b.renderedAt.getTime();
    if (dt !== 0) return dt;
    return a.title.localeCompare(b.title);
  });
  return all;
}
