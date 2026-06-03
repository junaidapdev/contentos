-- Chunk 06: generalize Chunk 05's get_content_item_siblings into a function that handles every
-- relationship_type. Replaces the chunk-05 function (the frontend's only caller,
-- useContentItemSiblings, is updated in the same chunk to call this new signature).
-- Forward-compatible with Chunk 07's 'repurposed_from'.
--
-- Semantics: given an item id and a relationship_type, return every OTHER item connected to it
-- by that relationship. Handles both the hub-as-input and spoke-as-input cases:
--   - hubs CTE: items the input is a child of, plus the input itself (if it's a hub).
--   - related CTE: every child of those hubs, plus every hub the children belong to, plus the
--     hubs themselves. Final filter drops the input id.
--
-- security invoker: RLS on content_items + content_relationships scopes the result to the caller.
drop function if exists public.get_content_item_siblings(uuid);

create or replace function public.get_content_item_relations(
  p_item_id uuid,
  p_relationship_type text
)
returns setof public.content_items
language sql
security invoker
set search_path = public
as $$
  with hubs as (
    select parent_id as id
      from public.content_relationships
      where child_id = p_item_id and relationship_type = p_relationship_type
    union
    select id from public.content_items where id = p_item_id
  ),
  related as (
    select child_id as id
      from public.content_relationships
      where parent_id in (select id from hubs) and relationship_type = p_relationship_type
    union
    select parent_id
      from public.content_relationships
      where child_id in (select id from hubs) and relationship_type = p_relationship_type
    union
    select id from hubs
  )
  select * from public.content_items
    where id in (select id from related)
      and id <> p_item_id
    order by created_at asc;
$$;

grant execute on function public.get_content_item_relations(uuid, text) to authenticated;
