import { z } from 'zod';

// Matches migration: content_relationships
//   relationship_type check list (3 values)
//   parent_id, child_id uuid not null; created_at only (NO updated_at on this table)
// DB-level guards (parent_id <> child_id; unique(user_id,parent_id,child_id,relationship_type))
// are enforced by the database.
export const RELATIONSHIP_TYPE_VALUES = ['sibling', 'cross_post', 'repurposed_from'] as const;

export const RelationshipTypeSchema = z.enum(RELATIONSHIP_TYPE_VALUES);

export const ContentRelationshipSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  parent_id: z.string().uuid(),
  child_id: z.string().uuid(),
  relationship_type: RelationshipTypeSchema,
  created_at: z.string(),
});

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
export type ContentRelationship = z.infer<typeof ContentRelationshipSchema>;
