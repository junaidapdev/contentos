import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { ContentItemSchema, type ContentItem } from '@shared/schemas/content-item';
import { ideasQueryKeys } from './ideas-query-keys';

const ItemsSchema = z.array(ContentItemSchema);

const EdgeSchema = z.object({
  parent_id: z.uuid(),
  child_id: z.uuid(),
});
const EdgesSchema = z.array(EdgeSchema);

export interface SiblingStar {
  hub: ContentItem;
  spokes: ContentItem[];
}

export interface SpawnedItemsResult {
  // All items linked to this idea, in created-at order.
  allItems: ContentItem[];
  // Items grouped into sibling stars (hub + spokes), reconstructed from content_relationships.
  stars: SiblingStar[];
  // Items linked to this idea but NOT in any sibling star (e.g., a single item pre-linked via the
  // standalone content-item form rather than via the spawn flow).
  loneItems: ContentItem[];
}

// Deviation from the chunk-05 spec's "returns z.array(ContentItemSchema)": the panel needs star
// membership to render groups, so we co-fetch the sibling edges among these items and return both.
// Two thin queries (each RLS-scoped) — kept under one query key so useSpawnSiblings's invalidation
// (ideasQueryKeys.spawnedItems(ideaId)) refreshes the full panel atomically.
export function useIdeaSpawnedItems(ideaId: string) {
  return useQuery({
    queryKey: ideasQueryKeys.spawnedItems(ideaId),
    enabled: Boolean(ideaId),
    queryFn: async (): Promise<SpawnedItemsResult> => {
      const itemsRes = await supabase
        .from('content_items')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });
      if (itemsRes.error) {
        logger.error('idea_spawned_items_failed', { code: itemsRes.error.code, ideaId });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const itemsParsed = ItemsSchema.safeParse(itemsRes.data);
      if (!itemsParsed.success) {
        logger.error('idea_spawned_items_invalid_response', {
          issues: itemsParsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      const allItems = itemsParsed.data;
      if (allItems.length === 0) {
        return { allItems, stars: [], loneItems: [] };
      }

      const ids = allItems.map((i) => i.id);
      const edgesRes = await supabase
        .from('content_relationships')
        .select('parent_id, child_id')
        .eq('relationship_type', 'sibling')
        .in('parent_id', ids)
        .in('child_id', ids);
      if (edgesRes.error) {
        logger.error('idea_spawned_edges_failed', { code: edgesRes.error.code, ideaId });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const edgesParsed = EdgesSchema.safeParse(edgesRes.data);
      if (!edgesParsed.success) {
        logger.error('idea_spawned_edges_invalid_response', {
          issues: edgesParsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      const edges = edgesParsed.data;

      // Star topology: every edge is hub -> spoke. An item that appears as parent_id in any edge
      // is a hub; spokes never appear as parent. Reconstruct hub -> [spokes] groups.
      const itemById = new Map(allItems.map((i) => [i.id, i]));
      const hubToSpokes = new Map<string, ContentItem[]>();
      const usedIds = new Set<string>();

      for (const edge of edges) {
        const hub = itemById.get(edge.parent_id);
        const spoke = itemById.get(edge.child_id);
        if (!hub || !spoke) continue;
        if (!hubToSpokes.has(edge.parent_id)) {
          hubToSpokes.set(edge.parent_id, []);
        }
        hubToSpokes.get(edge.parent_id)?.push(spoke);
        usedIds.add(edge.parent_id);
        usedIds.add(edge.child_id);
      }

      const stars: SiblingStar[] = [];
      for (const [hubId, spokes] of hubToSpokes) {
        const hub = itemById.get(hubId);
        if (!hub) continue;
        stars.push({ hub, spokes });
      }

      const loneItems = allItems.filter((item) => !usedIds.has(item.id));

      return { allItems, stars, loneItems };
    },
  });
}
