-- Chunk 07: repurposing spawn RPC. One long-form parent -> N derivative children in one atomic
-- call. Inserts N rows in public.content_items + N rows in public.content_relationships
-- (repurposed_from: parent -> each child). Pattern-identical to spawn_sibling_content_items
-- (Chunk 05) and spawn_cross_post_variants (Chunk 06).
--
-- Title and pillar_id default from the parent if omitted per-spec; idea_id ALWAYS inherits from
-- parent (the conceptual lineage is preserved). format MUST be explicit per spec — the entire
-- point of repurposing is producing different formats. notes start NULL on every child (parent
-- notes are typically irrelevant to a derivative).
--
-- The partial unique index on (user_id, child_id) WHERE relationship_type = 'repurposed_from'
-- (chunk-07 migration) prevents a child from being claimed by a second parent later, even via a
-- separate call.
--
-- security invoker: RLS scopes everything to the caller. Cross-user spawn returns NOT_FOUND.
create or replace function public.spawn_repurposed_children(
  p_parent_item_id uuid,
  p_specs jsonb
)
returns setof public.content_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_parent public.content_items;
  v_spec_count int;
  v_spec jsonb;
  v_inserted_ids uuid[] := array[]::uuid[];
  v_inserted_id uuid;
  v_default_pillar uuid;
  v_idx int;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Locate parent via RLS-evaluated select; not-found if the caller doesn't own it.
  select * into v_parent from public.content_items where id = p_parent_item_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  v_spec_count := jsonb_array_length(p_specs);
  if v_spec_count < 1 then
    raise exception 'NO_SPECS' using errcode = 'P0001';
  end if;
  if v_spec_count > 12 then
    raise exception 'TOO_MANY_SPECS' using errcode = 'P0001';
  end if;

  v_default_pillar := v_parent.pillar_id;

  for v_idx in 0 .. v_spec_count - 1 loop
    v_spec := p_specs -> v_idx;

    insert into public.content_items (
      user_id, idea_id, platform_id, pillar_id, title, format, status, notes
    ) values (
      v_user_id,
      v_parent.idea_id,
      nullif(v_spec ->> 'platform_id', '')::uuid,
      coalesce(nullif(v_spec ->> 'pillar_id', '')::uuid, v_default_pillar),
      coalesce(nullif(v_spec ->> 'title', ''), v_parent.title),
      v_spec ->> 'format',
      'idea',
      null
    )
    returning id into v_inserted_id;

    v_inserted_ids := array_append(v_inserted_ids, v_inserted_id);

    insert into public.content_relationships (
      user_id, parent_id, child_id, relationship_type
    ) values (
      v_user_id, p_parent_item_id, v_inserted_id, 'repurposed_from'
    );
  end loop;

  return query
    select * from public.content_items
    where id = any (v_inserted_ids)
    order by created_at asc;
end;
$$;

grant execute on function public.spawn_repurposed_children(uuid, jsonb) to authenticated;
