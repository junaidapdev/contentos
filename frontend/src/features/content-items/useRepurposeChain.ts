import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { ERROR_CODES } from '@/constants/error-codes';
import { ContentItemSchema, type ContentItem } from '@shared/schemas/content-item';
import { contentItemsQueryKeys } from './content-items-query-keys';

const ChildrenSchema = z.array(ContentItemSchema);
const ParentEdgeSchema = z.object({ parent_id: z.uuid() }).nullable();
const ChildrenEdgesSchema = z.array(z.object({ child_id: z.uuid() }));

export interface RepurposeChain {
  // The parent of the input item (null if the input is not a repurposed child).
  parent: ContentItem | null;
  // Children where the input item is the `repurposed_from` parent. Empty if none.
  children: ContentItem[];
}

// Three thin queries (parent edge → parent item → children edges + items). Acceptable for now;
// the spec sets a 150-line threshold for promoting to a server-side helper, and this stays well
// under that. If a future chunk grows the data shape (e.g., per-child status counts, multi-level
// chain expansion), promote to a single RPC `public.get_repurpose_chain(p_item_id uuid)`.
export function useRepurposeChain(itemId: string) {
  return useQuery({
    queryKey: [...contentItemsQueryKeys.detail(itemId), 'repurpose-chain'] as const,
    enabled: Boolean(itemId),
    queryFn: async (): Promise<RepurposeChain> => {
      // 1) Does this item have a repurposed_from parent?
      const parentEdgeRes = await supabase
        .from('content_relationships')
        .select('parent_id')
        .eq('child_id', itemId)
        .eq('relationship_type', 'repurposed_from')
        .maybeSingle();
      if (parentEdgeRes.error) {
        logger.error('repurpose_parent_edge_failed', {
          code: parentEdgeRes.error.code,
          itemId,
        });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const parentEdgeParsed = ParentEdgeSchema.safeParse(parentEdgeRes.data);
      if (!parentEdgeParsed.success) {
        logger.error('repurpose_parent_edge_invalid_response', {
          issues: parentEdgeParsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }

      let parent: ContentItem | null = null;
      if (parentEdgeParsed.data) {
        const parentRes = await supabase
          .from('content_items')
          .select('*')
          .eq('id', parentEdgeParsed.data.parent_id)
          .maybeSingle();
        if (parentRes.error) {
          logger.error('repurpose_parent_fetch_failed', {
            code: parentRes.error.code,
            itemId,
          });
          throw new Error(ERROR_CODES.INTERNAL_ERROR);
        }
        if (parentRes.data) {
          const parentParsed = ContentItemSchema.safeParse(parentRes.data);
          if (!parentParsed.success) {
            logger.error('repurpose_parent_invalid_response', {
              issues: parentParsed.error.issues.length,
            });
            throw new Error(ERROR_CODES.INVALID_RESPONSE);
          }
          parent = parentParsed.data;
        }
        // parentRes.data === null when the edge points at a parent the caller can't see (RLS).
        // We log nothing and proceed; parent stays null which the panel handles gracefully.
      }

      // 2) Find children where this item is the repurposed_from parent.
      const childrenEdgesRes = await supabase
        .from('content_relationships')
        .select('child_id')
        .eq('parent_id', itemId)
        .eq('relationship_type', 'repurposed_from');
      if (childrenEdgesRes.error) {
        logger.error('repurpose_children_edges_failed', {
          code: childrenEdgesRes.error.code,
          itemId,
        });
        throw new Error(ERROR_CODES.INTERNAL_ERROR);
      }
      const childrenEdgesParsed = ChildrenEdgesSchema.safeParse(childrenEdgesRes.data);
      if (!childrenEdgesParsed.success) {
        logger.error('repurpose_children_edges_invalid_response', {
          issues: childrenEdgesParsed.error.issues.length,
        });
        throw new Error(ERROR_CODES.INVALID_RESPONSE);
      }

      let children: ContentItem[] = [];
      if (childrenEdgesParsed.data.length > 0) {
        const childIds = childrenEdgesParsed.data.map((r) => r.child_id);
        const childrenRes = await supabase
          .from('content_items')
          .select('*')
          .in('id', childIds)
          .order('created_at', { ascending: true });
        if (childrenRes.error) {
          logger.error('repurpose_children_fetch_failed', {
            code: childrenRes.error.code,
            itemId,
          });
          throw new Error(ERROR_CODES.INTERNAL_ERROR);
        }
        const childrenParsed = ChildrenSchema.safeParse(childrenRes.data);
        if (!childrenParsed.success) {
          logger.error('repurpose_children_invalid_response', {
            issues: childrenParsed.error.issues.length,
          });
          throw new Error(ERROR_CODES.INVALID_RESPONSE);
        }
        children = childrenParsed.data;
      }

      return { parent, children };
    },
  });
}
