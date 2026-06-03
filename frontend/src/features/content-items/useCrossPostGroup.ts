import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { ContentItemSchema, type ContentItem } from '@shared/schemas/content-item';
import type { Platform } from '@shared/schemas/platform';
import { contentItemsQueryKeys } from './content-items-query-keys';

const RelationsResultSchema = z.array(ContentItemSchema);
const ParentEdgeSchema = z.object({ parent_id: z.uuid() }).nullable();

export interface CrossPostGroup {
  // The source (hub) of the cross-post group. The input item is either this hub itself or one of
  // its children.
  sourceItem: ContentItem;
  // Every item in the group, INCLUDING the source. Ordered by created_at asc.
  variants: ContentItem[];
  // The caller's active platforms that aren't covered by any variant.
  missingPlatforms: Platform[];
  // variants.length / (variants.length + missingPlatforms.length); 0 when there are no active platforms.
  coverageRatio: number;
}

// Returns the input item's cross-post group, or null if the item is not part of any cross-post
// group. Topology: a single hub (the source) with N child variants; a content item can be in at
// most one cross-post group (enforced by the partial unique index on content_relationships
// (user_id, child_id) WHERE relationship_type = 'cross_post'). The function detects whether the
// input is the hub or a spoke and assembles the group from both directions.
//
// Three thin queries; the alternative (one server-side helper) was considered but the join logic
// stays under the spec's 150-line guidance and reads clearly here. If a future chunk grows this
// (e.g., per-variant counts), reconsider.
export function useCrossPostGroup(itemId: string, activePlatforms: Platform[] | undefined) {
  return useQuery({
    queryKey: [...contentItemsQueryKeys.detail(itemId), 'cross-post-group'] as const,
    enabled: Boolean(itemId) && activePlatforms !== undefined,
    queryFn: async (): Promise<CrossPostGroup | null> => {
      // 1) The input item itself.
      const itemRes = await supabase
        .from('content_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();
      if (itemRes.error) {
        logger.error('cross_post_group_item_failed', { code: itemRes.error.code, itemId });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      if (!itemRes.data) {
        throw new Error(ERROR_CODES.NOT_FOUND);
      }
      const itemParsed = ContentItemSchema.safeParse(itemRes.data);
      if (!itemParsed.success) {
        logger.error('cross_post_group_item_invalid_response', {
          issues: itemParsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      const item = itemParsed.data;

      // 2) Every item connected to the input via a 'cross_post' relationship.
      const relRes = await supabase.rpc('get_content_item_relations', {
        p_item_id: itemId,
        p_relationship_type: 'cross_post',
      });
      if (relRes.error) {
        logger.error('cross_post_group_relations_failed', { code: relRes.error.code, itemId });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const relParsed = RelationsResultSchema.safeParse(relRes.data ?? []);
      if (!relParsed.success) {
        logger.error('cross_post_group_relations_invalid_response', {
          issues: relParsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      const related = relParsed.data;

      // 3) Determine whether the input is the hub (no parent edge) or a spoke (has a parent edge).
      const parentRes = await supabase
        .from('content_relationships')
        .select('parent_id')
        .eq('child_id', itemId)
        .eq('relationship_type', 'cross_post')
        .maybeSingle();
      if (parentRes.error) {
        logger.error('cross_post_group_parent_failed', { code: parentRes.error.code, itemId });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parentParsed = ParentEdgeSchema.safeParse(parentRes.data);
      if (!parentParsed.success) {
        logger.error('cross_post_group_parent_invalid_response', {
          issues: parentParsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      const parentEdge = parentParsed.data;

      // No relations AND no parent edge → input isn't part of any cross-post group.
      if (related.length === 0 && parentEdge === null) {
        return null;
      }

      // Source = the parent (if input is a spoke) or the input itself (if input is a hub).
      let sourceItem: ContentItem;
      if (parentEdge) {
        // Input is a spoke — the source lives in `related` (the generalized RPC includes hubs).
        const fromRelated = related.find((r) => r.id === parentEdge.parent_id);
        if (!fromRelated) {
          logger.error('cross_post_group_parent_missing_from_relations', {
            parentId: parentEdge.parent_id,
            itemId,
          });
          throw new Error(ERROR_CODES.INVALID_RESPONSE);
        }
        sourceItem = fromRelated;
      } else {
        sourceItem = item;
      }

      // Assemble variants = source + every other item (input itself + related), deduped by id.
      const all: ContentItem[] = [sourceItem, item, ...related];
      const seen = new Set<string>();
      const variants = all
        .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)))
        .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));

      const platforms = activePlatforms ?? [];
      const coveredPlatformIds = new Set(
        variants.map((v) => v.platform_id).filter((p): p is string => p !== null),
      );
      const missingPlatforms = platforms.filter((p) => !coveredPlatformIds.has(p.id));
      const coverageRatio =
        platforms.length > 0 ? coveredPlatformIds.size / platforms.length : 0;

      return { sourceItem, variants, missingPlatforms, coverageRatio };
    },
  });
}
