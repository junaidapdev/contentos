-- Chunk 06: a content item can belong to AT MOST ONE cross-post group — i.e., it can be the
-- child in at most one cross-post edge. The source (parent) may have many children, so the
-- constraint applies only to child_id, only when relationship_type = 'cross_post'. Sibling
-- membership is unaffected (different relationship_type, different index).
--
-- Partial unique index on (user_id, child_id) WHERE relationship_type = 'cross_post'. Postgres
-- treats NULLs as distinct in unique indexes by default; child_id is NOT NULL on
-- content_relationships (Chunk 02), so no NULL-handling subtlety here.
--
-- The Chunk 02 base constraint (user_id, parent_id, child_id, relationship_type) UNIQUE already
-- prevents the same exact edge twice. This new index is stricter: it forbids any second cross-post
-- edge for the same child, even if the parent is different.
create unique index content_relationships_cross_post_child_unique
  on public.content_relationships (user_id, child_id)
  where relationship_type = 'cross_post';
