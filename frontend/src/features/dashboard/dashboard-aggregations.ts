// Pure aggregation functions: rows + side-data → panel-shaped data. No fetching, no side
// effects, deterministic output. The dashboard renders four panels off one shared windowed
// query; these functions split that query into the four panels' data shapes.
//
// Each function is structured to be straightforward to unit-test (no in-flight refactor
// adds tests in this chunk; the shape is the prep).

import type {
  ContentItemListRow,
  ContentItemStatus,
} from '@shared/schemas/content-item';
import { CONTENT_ITEM_STATUS_VALUES } from '@shared/schemas/content-item';
import type { ContentPillar } from '@shared/schemas/content-pillar';
import type { Platform } from '@shared/schemas/platform';
import type { CadenceTarget } from '@shared/schemas/cadence-target';
import { CADENCE_DELTA_TOLERANCE } from './dashboard-constants';

// ---------------------------------------------------------------------------
// Pillar balance
// ---------------------------------------------------------------------------

export interface PillarBalanceRow {
  pillarId: string | null; // null = the "No pillar" sentinel row
  pillarName: string; // "No pillar" for null
  count: number;
}

// Counts only items in `scheduled` or `published` — those are the "on the publishing track"
// statuses. Drafts/ideas would conflate intent with output. The "No pillar" row pins at the
// bottom regardless of its count so it doesn't compete with categorized pillars in the sort.
export function computePillarBalance(
  rows: ContentItemListRow[],
  pillars: ContentPillar[],
  noPillarLabel: string,
): PillarBalanceRow[] {
  const filtered = rows.filter((r) => r.status === 'scheduled' || r.status === 'published');

  const byPillarId = new Map<string | null, number>();
  for (const item of filtered) {
    const key = item.pillar_id ?? null;
    byPillarId.set(key, (byPillarId.get(key) ?? 0) + 1);
  }

  const categorized: PillarBalanceRow[] = pillars.map((p) => ({
    pillarId: p.id,
    pillarName: p.name,
    count: byPillarId.get(p.id) ?? 0,
  }));
  categorized.sort(
    (a, b) => b.count - a.count || a.pillarName.localeCompare(b.pillarName),
  );

  const noPillarCount = byPillarId.get(null) ?? 0;
  // Always emit the "No pillar" row when there are any uncategorized items, OR when the entire
  // panel is empty (so the empty state has something to anchor on). When the user has zero
  // uncategorized items AND there's at least one categorized count, we hide the row to keep
  // the chart clean.
  const showNoPillar = noPillarCount > 0 || filtered.length === 0;

  return showNoPillar
    ? [
        ...categorized,
        { pillarId: null, pillarName: noPillarLabel, count: noPillarCount },
      ]
    : categorized;
}

// ---------------------------------------------------------------------------
// Cadence vs targets
// ---------------------------------------------------------------------------

export type CadenceState = 'on_target' | 'under' | 'over' | 'untracked';

export interface CadenceRow {
  platformId: string;
  platformName: string;
  targetPerWeek: number;
  actualPerWeek: number; // window-normalized: published count ÷ (days/7)
  delta: number; // actualPerWeek - targetPerWeek (signed)
  state: CadenceState;
}

// One row per cadence target the user owns. Each target's platform display name is resolved
// from the supplied platform map (looked up by platform_id). `untracked` is the explicit
// "no target set" state: a creator who set a target of 0 didn't tell us anything about their
// intent, so we render the row but classify it neutrally.
export function computeCadence(
  rows: ContentItemListRow[],
  targets: CadenceTarget[],
  platforms: Platform[],
  days: number,
): CadenceRow[] {
  const windowWeeks = days / 7;
  const platformById = new Map(platforms.map((p) => [p.id, p]));

  const publishedByPlatform = new Map<string, number>();
  for (const item of rows) {
    if (item.status !== 'published') continue;
    if (!item.platform_id) continue;
    publishedByPlatform.set(
      item.platform_id,
      (publishedByPlatform.get(item.platform_id) ?? 0) + 1,
    );
  }

  return targets.map((t) => {
    const actualPerWeek = (publishedByPlatform.get(t.platform_id) ?? 0) / windowWeeks;
    const target = t.weekly_target;
    let state: CadenceState;
    if (target === 0) {
      state = 'untracked';
    } else {
      const ratio = actualPerWeek / target;
      if (ratio >= 1 - CADENCE_DELTA_TOLERANCE && ratio <= 1 + CADENCE_DELTA_TOLERANCE) {
        state = 'on_target';
      } else if (ratio < 1) {
        state = 'under';
      } else {
        state = 'over';
      }
    }
    return {
      platformId: t.platform_id,
      platformName: platformById.get(t.platform_id)?.display_name ?? '(unknown)',
      targetPerWeek: target,
      actualPerWeek,
      delta: actualPerWeek - target,
      state,
    };
  });
}

// ---------------------------------------------------------------------------
// Status mix
// ---------------------------------------------------------------------------

export interface StatusMixRow {
  status: ContentItemStatus;
  count: number;
}

// Counts ALL items whose created_at falls in the visible window, grouped by status. This is the
// "pipeline" view — answers "what's in flight," NOT "what's gone out." The list view query may
// return rows whose created_at falls outside the window (because they have a scheduled_for or
// published_at INSIDE it); those rows aren't part of the pipeline mix.
export function computeStatusMix(
  rows: ContentItemListRow[],
  windowStart: Date,
): StatusMixRow[] {
  const counts = new Map<ContentItemStatus, number>(
    CONTENT_ITEM_STATUS_VALUES.map((s) => [s, 0]),
  );
  for (const item of rows) {
    const createdAt = new Date(item.created_at);
    if (createdAt < windowStart) continue;
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }
  // Stable lifecycle order so the stacked bar reads left-to-right idea → published.
  return CONTENT_ITEM_STATUS_VALUES.map((s) => ({
    status: s,
    count: counts.get(s) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Top empty (pillar × platform) cells
// ---------------------------------------------------------------------------

export interface EmptyCell {
  pillarId: string;
  pillarName: string;
  platformId: string;
  platformName: string;
}

// Cross-product of (pillars × active platforms) minus cells that already have at least one
// published item in the window. Sorted alphabetically (pillar, then platform) for stable
// display; capped at `limit` per the dashboard's "where to focus" purpose. Fully client-side
// — the cross-product is typically <30 cells for an MVP user.
export function computeTopEmptyCells(
  rows: ContentItemListRow[],
  pillars: ContentPillar[],
  platforms: Platform[],
  limit: number,
): EmptyCell[] {
  const filled = new Set<string>();
  for (const item of rows) {
    if (item.status !== 'published') continue;
    if (!item.pillar_id || !item.platform_id) continue;
    filled.add(`${item.pillar_id}|${item.platform_id}`);
  }

  const empty: EmptyCell[] = [];
  for (const pillar of pillars) {
    for (const platform of platforms) {
      if (!platform.is_active) continue;
      if (!filled.has(`${pillar.id}|${platform.id}`)) {
        empty.push({
          pillarId: pillar.id,
          pillarName: pillar.name,
          platformId: platform.id,
          platformName: platform.display_name,
        });
      }
    }
  }

  empty.sort((a, b) => {
    const byPillar = a.pillarName.localeCompare(b.pillarName);
    if (byPillar !== 0) return byPillar;
    return a.platformName.localeCompare(b.platformName);
  });

  return empty.slice(0, limit);
}
