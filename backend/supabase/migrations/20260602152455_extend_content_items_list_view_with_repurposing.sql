-- Chunk 07: replace the Chunk 06 view (content_items_with_cross_post_size) with the unified
-- content_items_list_view, augmenting each content_items row with FIVE per-relationship aggregates
-- so the content-items list page can render every relationship badge without N+1 queries:
--
--   cross_post_group_size         — full group size (source + children), or 0 if not in any group
--   sibling_group_size            — full sibling-star size (hub + spokes), or 0 if not in any star
--   repurposed_children_count     — number of items where THIS row is the `repurposed_from` parent
--   repurposed_from_parent_id     — uuid of the parent if this row is a repurposed child, else null
--   repurposed_from_parent_title  — parent's title (denormalized so the row badge can show it)
--
-- The cross_post and sibling aggregates use the same `CASE … exists` structure as the Chunk 06 view
-- (see that migration's note about the LATERAL aggregate gotcha — `count(*)` over the empty set is
-- 0, so `1 + count(*)` wrongly reports 1 when not in any group). Explicit CASE branches keep "not
-- in any group → 0" correct.
--
-- security_invoker = true (Postgres 15+) makes the view evaluate RLS as the calling role. The
-- underlying tables (content_items + content_relationships) carry RLS policies of
-- `auth.uid() = user_id`, so a caller sees only their own rows + their own relationships +
-- their own repurposed_from parent.
--
-- Performance note: this view runs three CASE/EXISTS branches + one LEFT JOIN per row. For users
-- with hundreds of items the per-row cost is bounded (each EXISTS hits an index), but if list
-- latency degrades, the next optimization is a materialized view refreshed via triggers on
-- content_relationships writes. Defer until measured.
drop view if exists public.content_items_with_cross_post_size;

create or replace view public.content_items_list_view
with (security_invoker = true)
as
select
  ci.*,

  -- Cross-post group size (chunk 06 logic, kept structurally identical).
  case
    when exists (
      select 1 from public.content_relationships
        where parent_id = ci.id and relationship_type = 'cross_post'
    )
    then (
      select 1 + count(*)
        from public.content_relationships
        where parent_id = ci.id and relationship_type = 'cross_post'
    )
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
    else 0
  end as cross_post_group_size,

  -- Sibling group size (same shape, relationship_type = 'sibling').
  case
    when exists (
      select 1 from public.content_relationships
        where parent_id = ci.id and relationship_type = 'sibling'
    )
    then (
      select 1 + count(*)
        from public.content_relationships
        where parent_id = ci.id and relationship_type = 'sibling'
    )
    when exists (
      select 1 from public.content_relationships
        where child_id = ci.id and relationship_type = 'sibling'
    )
    then (
      select 1 + count(*)
        from public.content_relationships
        where relationship_type = 'sibling'
          and parent_id = (
            select parent_id from public.content_relationships
              where child_id = ci.id and relationship_type = 'sibling'
              limit 1
          )
    )
    else 0
  end as sibling_group_size,

  -- Repurposed children count: how many derivatives does THIS row spawn? 0 if it's not a parent.
  (
    select count(*)
      from public.content_relationships
      where parent_id = ci.id and relationship_type = 'repurposed_from'
  ) as repurposed_children_count,

  -- If THIS row is itself a repurposed child, expose the parent's id + title for the list badge.
  rep_parent.id as repurposed_from_parent_id,
  rep_parent.title as repurposed_from_parent_title
from public.content_items ci

left join public.content_relationships rep_edge
  on rep_edge.child_id = ci.id and rep_edge.relationship_type = 'repurposed_from'

left join public.content_items rep_parent
  on rep_parent.id = rep_edge.parent_id;

grant select on public.content_items_list_view to authenticated;
