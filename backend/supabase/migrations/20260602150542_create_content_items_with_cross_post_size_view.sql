-- Chunk 06: read-optimized view that augments public.content_items with the size of the row's
-- cross-post group. Backs the content-items list query so the "+N platforms" badge can render
-- without an N+1 query.
--
-- security_invoker = true (Postgres 15+) makes the view evaluate RLS as the calling role. The
-- underlying tables (content_items + content_relationships) carry RLS policies of
-- `auth.uid() = user_id`, so a caller sees only their own rows + their own relationships.
--
-- cross_post_group_size semantics — counts ALL members of the cross-post group, INCLUDING the
-- input row itself (so an item in a 3-platform group reports 3, not 2):
--   * Item not in any cross-post relationship                 → 0  (no group at all; badge hidden)
--   * Item is the source (parent of >=1 cross-post edge)      → 1 + number of children
--   * Item is a child (a row's child_id = this id, type='cp') → 1 + number of siblings of the source
-- A "0" return for an item that has no cross-post edges is the signal the badge uses to hide
-- itself. The list-row badge renders only when cross_post_group_size > 1, which is equivalent to
-- "the row is part of a cross-post group of two or more platforms."
--
-- Implementation note: the previous draft used a LEFT JOIN LATERAL with `coalesce(size, 0)` but
-- the LATERAL aggregate always returns a single row (size=1 even when the subquery's WHERE matches
-- nothing, because count() over an empty set is 0 and 1+0=1). Explicit branches via CASE make the
-- intent unambiguous: "not in any group" → 0, source → 1+children, child → 1+siblings.
create or replace view public.content_items_with_cross_post_size
with (security_invoker = true)
as
select
  ci.*,
  case
    -- Item is a source: count itself + its direct children.
    when exists (
      select 1 from public.content_relationships
        where parent_id = ci.id and relationship_type = 'cross_post'
    )
    then (
      select 1 + count(*)
        from public.content_relationships
        where parent_id = ci.id and relationship_type = 'cross_post'
    )
    -- Item is a child: count itself + all other children of its source (the parent).
    when exists (
      select 1 from public.content_relationships
        where child_id = ci.id and relationship_type = 'cross_post'
    )
    then (
      select 1 + count(*)
        from public.content_relationships
        where relationship_type = 'cross_post'
          and parent_id = (
            select parent_id from public.content_relationships
              where child_id = ci.id and relationship_type = 'cross_post'
              limit 1
          )
    )
    -- Not in any cross-post group.
    else 0
  end as cross_post_group_size
from public.content_items ci;

grant select on public.content_items_with_cross_post_size to authenticated;
