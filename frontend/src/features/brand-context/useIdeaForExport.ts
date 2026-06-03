import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { IdeaSchema, type Idea } from '@shared/schemas/idea';
import { ContentItemSchema, type ContentItem } from '@shared/schemas/content-item';
import { brandContextQueryKeys } from './brand-context-query-keys';

const ItemsSchema = z.array(ContentItemSchema);
const PillarRowSchema = z.object({ name: z.string().min(1).max(100) }).nullable();
const PlatformRowsSchema = z.array(z.object({ id: z.uuid(), display_name: z.string() }));
const EdgeSchema = z.object({
  parent_id: z.uuid(),
  child_id: z.uuid(),
  relationship_type: z.string(),
});
const EdgesSchema = z.array(EdgeSchema);

export interface IdeaExportData {
  idea: Idea;
  pillarName: string | null;
  spawnedItems: ContentItem[];
  crossPostGroupSummaries: string[];
  repurposingChainSummaries: string[];
}

// Assembles everything the idea-scoped pack needs, in a handful of thin RLS-scoped queries:
//   1. the idea, 2. its pillar name (if any), 3. spawned items (idea_id = idea.id),
//   4. platform names, 5. cross_post + repurposed_from edges among the spawned items.
// Relationship summaries are DELIBERATELY FLAT strings (the pack format avoids deep nesting —
// see pack-builder.ts). Cross-post/repurposed children inherit idea_id from their source
// (Chunks 06/07), so the edges among spawnedItems capture the relevant relationships without a
// transitive expansion. Trade-off: a relationship whose other end was re-parented to a different
// idea won't appear — acceptable for an export-context summary. ~120 lines; if this grows past
// ~150 the spec's escape hatch is a server-side export_idea_context RPC (not built this chunk).
export function useIdeaForExport(ideaId: string, enabled = true) {
  return useQuery({
    queryKey: brandContextQueryKeys.ideaExport(ideaId),
    enabled: Boolean(ideaId) && enabled,
    queryFn: async (): Promise<IdeaExportData> => {
      // 1. The idea.
      const ideaRes = await supabase.from('ideas').select('*').eq('id', ideaId).maybeSingle();
      if (ideaRes.error) {
        logger.error('idea_export_idea_failed', { code: ideaRes.error.code, ideaId });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      if (!ideaRes.data) throw new Error(ERROR_CODES.NOT_FOUND);
      const ideaParsed = IdeaSchema.safeParse(ideaRes.data);
      if (!ideaParsed.success) {
        logger.error('idea_export_idea_invalid', { issues: ideaParsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      const idea = ideaParsed.data;

      // 2. Pillar name (only if the idea has a pillar).
      let pillarName: string | null = null;
      if (idea.pillar_id) {
        const pillarRes = await supabase
          .from('content_pillars')
          .select('name')
          .eq('id', idea.pillar_id)
          .maybeSingle();
        if (pillarRes.error) {
          logger.error('idea_export_pillar_failed', { code: pillarRes.error.code });
          throw new Error(ERROR_CODES.INTERNAL_ERROR);
        }
        const pillarParsed = PillarRowSchema.safeParse(pillarRes.data);
        if (pillarParsed.success && pillarParsed.data) {
          pillarName = pillarParsed.data.name;
        }
      }

      // 3. Spawned items.
      const itemsRes = await supabase
        .from('content_items')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });
      if (itemsRes.error) {
        logger.error('idea_export_items_failed', { code: itemsRes.error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const itemsParsed = ItemsSchema.safeParse(itemsRes.data);
      if (!itemsParsed.success) {
        logger.error('idea_export_items_invalid', { issues: itemsParsed.error.issues.length });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }
      const spawnedItems = itemsParsed.data;

      if (spawnedItems.length === 0) {
        return { idea, pillarName, spawnedItems, crossPostGroupSummaries: [], repurposingChainSummaries: [] };
      }

      // 4. Platform names (for cross-post summaries).
      const platformsRes = await supabase.from('platforms').select('id, display_name');
      if (platformsRes.error) {
        logger.error('idea_export_platforms_failed', { code: platformsRes.error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const platformsParsed = PlatformRowsSchema.safeParse(platformsRes.data);
      const platformNameById = new Map<string, string>(
        platformsParsed.success ? platformsParsed.data.map((p) => [p.id, p.display_name]) : [],
      );

      // 5. Relationship edges among the spawned items.
      const ids = spawnedItems.map((i) => i.id);
      const edgesRes = await supabase
        .from('content_relationships')
        .select('parent_id, child_id, relationship_type')
        .in('parent_id', ids)
        .in('relationship_type', ['cross_post', 'repurposed_from']);
      if (edgesRes.error) {
        logger.error('idea_export_edges_failed', { code: edgesRes.error.code });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const edgesParsed = EdgesSchema.safeParse(edgesRes.data);
      const edges = edgesParsed.success ? edgesParsed.data : [];

      const itemById = new Map(spawnedItems.map((i) => [i.id, i]));
      const crossPostChildrenByParent = new Map<string, string[]>();
      const repurposeChildrenByParent = new Map<string, number>();

      for (const edge of edges) {
        if (edge.relationship_type === 'cross_post') {
          const child = itemById.get(edge.child_id);
          const platformLabel = child?.platform_id
            ? (platformNameById.get(child.platform_id) ?? 'unknown platform')
            : 'no platform';
          const list = crossPostChildrenByParent.get(edge.parent_id) ?? [];
          list.push(platformLabel);
          crossPostChildrenByParent.set(edge.parent_id, list);
        } else if (edge.relationship_type === 'repurposed_from') {
          repurposeChildrenByParent.set(
            edge.parent_id,
            (repurposeChildrenByParent.get(edge.parent_id) ?? 0) + 1,
          );
        }
      }

      const crossPostGroupSummaries: string[] = [];
      for (const [parentId, platformLabels] of crossPostChildrenByParent) {
        const parentTitle = itemById.get(parentId)?.title ?? 'an item';
        const count = platformLabels.length;
        crossPostGroupSummaries.push(
          `${parentTitle}: cross-posted to ${String(count)} platform${count === 1 ? '' : 's'} (${platformLabels.join(', ')})`,
        );
      }

      const repurposingChainSummaries: string[] = [];
      for (const [parentId, count] of repurposeChildrenByParent) {
        const parentTitle = itemById.get(parentId)?.title ?? 'an item';
        repurposingChainSummaries.push(
          `${parentTitle} → ${String(count)} repurposed item${count === 1 ? '' : 's'}`,
        );
      }

      return { idea, pillarName, spawnedItems, crossPostGroupSummaries, repurposingChainSummaries };
    },
  });
}
