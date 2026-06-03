import { useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { ContentItemListRowSchema, type ContentItemListRow } from '@shared/schemas/content-item';
import { contentItemsQueryKeys } from './content-items-query-keys';

export const CONTENT_ITEMS_PAGE_SIZE = 25;

// Chunk 07: select from public.content_items_list_view (replaces the Chunk 06
// content_items_with_cross_post_size view). The view adds cross_post_group_size,
// sibling_group_size, repurposed_children_count, repurposed_from_parent_id, and
// repurposed_from_parent_title — the per-row aggregates the list-row badges need without N+1
// queries. PostgREST still surfaces the joined ideas relation as an object on each row.
const JoinedIdeaSchema = z.object({ title: z.string().min(1).max(300) }).nullable();
const ContentItemWithJoinSchema = ContentItemListRowSchema.extend({
  ideas: JoinedIdeaSchema.optional(),
});
const ContentItemListSchema = z.array(ContentItemWithJoinSchema);

export interface ContentItemListEntry extends ContentItemListRow {
  ideaTitle: string | null;
}

export interface ContentItemsListFilters {
  status?: string | undefined;
  platform_id?: string | undefined;
  pillar_id?: string | undefined;
}

// Cursor pagination on updated_at desc (id desc as a tiebreaker for the stable in-page ordering the
// spec asks for). useInfiniteQuery accumulates pages natively — chosen over the spec's plain useQuery
// example so "Load more" needs no effect-driven state (which would trip react-hooks/set-state-in-effect).
// The cursor is the last loaded item's updated_at; distinct insert timestamps make skips/dups a
// non-issue in practice (a full composite (updated_at,id) cursor is a future refinement).
export function useContentItemsList(filters: ContentItemsListFilters) {
  return useInfiniteQuery({
    queryKey: contentItemsQueryKeys.list(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<ContentItemListEntry[]> => {
      let query = supabase
        .from('content_items_list_view')
        .select('*, ideas(title)')
        .order('updated_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(CONTENT_ITEMS_PAGE_SIZE);

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.platform_id) query = query.eq('platform_id', filters.platform_id);
      if (filters.pillar_id) query = query.eq('pillar_id', filters.pillar_id);
      if (pageParam) query = query.lt('updated_at', pageParam);

      const { data, error } = await query;
      if (error) {
        logger.error('content_items_list_failed', { code: error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parsed = ContentItemListSchema.safeParse(data);
      if (!parsed.success) {
        logger.error('content_items_list_invalid_response', { issues: parsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      return parsed.data.map(({ ideas, ...rest }) => ({
        ...rest,
        ideaTitle: ideas?.title ?? null,
      }));
    },
    getNextPageParam: (lastPage) =>
      lastPage.length === CONTENT_ITEMS_PAGE_SIZE
        ? lastPage[lastPage.length - 1]?.updated_at
        : undefined,
  });
}
