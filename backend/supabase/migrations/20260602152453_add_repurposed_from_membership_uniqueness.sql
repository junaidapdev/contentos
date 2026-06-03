-- Chunk 07: a content item can have AT MOST ONE `repurposed_from` parent. Mirrors the
-- Chunk 06 cross-post uniqueness rule. The repurposing parent (source) may have many children
-- (a long-form piece spawning a thread, a reel, a carousel, …), so the constraint applies only
-- to child_id, only when relationship_type = 'repurposed_from'.
--
-- Sibling membership and cross-post membership are independent of repurposing membership — each
-- uses its own partial unique index (or, for siblings, the base 4-tuple unique key from Chunk 02).
create unique index content_relationships_repurposed_from_child_unique
  on public.content_relationships (user_id, child_id)
  where relationship_type = 'repurposed_from';
