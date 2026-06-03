import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { ContentItemSchema } from '@shared/schemas/content-item';
import { localDateString } from '@/lib/datetime';
import type { ExamplesGroup } from './pack-builder';
import { brandContextQueryKeys } from './brand-context-query-keys';

const ItemsSchema = z.array(ContentItemSchema);
const PlatformRowsSchema = z.array(z.object({ id: z.uuid(), display_name: z.string() }));

export interface PublishedExamplesParams {
  enabled: boolean;
  count: number;
  platformId: string | null;
  pillarId: string | null;
}

// Fetches the most-recently-published items (optionally filtered by platform / pillar) and groups
// them by platform into the ExamplesGroup[] shape the pack builder consumes. Published items only —
// examples are about what actually shipped. Bounded by `count` so the pack stays small.
export function usePublishedExamples({
  enabled,
  count,
  platformId,
  pillarId,
}: PublishedExamplesParams) {
  return useQuery({
    queryKey: [
      ...brandContextQueryKeys.all,
      'published-examples',
      { count, platformId, pillarId },
    ] as const,
    enabled,
    queryFn: async (): Promise<ExamplesGroup[]> => {
      let query = supabase
        .from('content_items')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(count);
      if (platformId) query = query.eq('platform_id', platformId);
      if (pillarId) query = query.eq('pillar_id', pillarId);

      const { data, error } = await query;
      if (error) {
        logger.error('published_examples_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = ItemsSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('published_examples_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      const items = parsed.data;
      if (items.length === 0) return [];

      // Resolve platform names for grouping headings.
      const platformsRes = await supabase.from('platforms').select('id, display_name');
      const platformsParsed = PlatformRowsSchema.safeParse(platformsRes.data ?? []);
      const platformNameById = new Map<string, string>(
        platformsParsed.success ? platformsParsed.data.map((p) => [p.id, p.display_name]) : [],
      );

      // Group by platform display name (items without a platform fall under "No platform").
      const groups = new Map<string, ExamplesGroup>();
      for (const item of items) {
        const platformName = item.platform_id
          ? (platformNameById.get(item.platform_id) ?? 'Unknown platform')
          : 'No platform';
        const group = groups.get(platformName) ?? { platformName, items: [] };
        group.items.push({
          title: item.title,
          format: item.format,
          status: item.status,
          publishedAt: item.published_at ? localDateString(new Date(item.published_at)) : null,
        });
        groups.set(platformName, group);
      }
      return Array.from(groups.values());
    },
  });
}
