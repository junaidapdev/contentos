-- Chunk 05: sibling expansion. Given any content item, return all of its siblings
-- regardless of whether the input is the hub or a spoke. Sibling stars are stored as
-- (hub -> spoke) edges in content_relationships; this function unions the two lookup
-- directions so callers don't have to know the topology.
--
-- security invoker: RLS on content_items and content_relationships scopes the result
-- to the caller's own rows. The hubs CTE always includes the input id itself so spokes
-- can find each other; the final filter drops the input id from the result. Returns
-- rows from content_items so the canonical Zod ContentItemSchema validates the response.
create or replace function public.get_content_item_siblings(p_item_id uuid)
returns setof public.content_items
language sql
security invoker
set search_path = public
as $$
  with hubs as (
    -- Any hub the input is a spoke of, plus the input itself (the input may be the hub).
    select parent_id as id
      from public.content_relationships
      where child_id = p_item_id and relationship_type = 'sibling'
    union
    select id from public.content_items where id = p_item_id
  ),
  edges as (
    -- Each hub's spokes, each spoke's hub, and the hubs themselves — every node in the star.
    select child_id as id
      from public.content_relationships
      where parent_id in (select id from hubs) and relationship_type = 'sibling'
    union
    select parent_id
      from public.content_relationships
      where child_id in (select id from hubs) and relationship_type = 'sibling'
    union
    select id from hubs
  )
  select * from public.content_items
    where id in (select id from edges)
      and id <> p_item_id
    order by created_at asc;
$$;

grant execute on function public.get_content_item_siblings(uuid) to authenticated;
