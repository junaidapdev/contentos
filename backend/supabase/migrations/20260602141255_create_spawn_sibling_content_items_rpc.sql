-- Chunk 05: sibling spawning. One idea -> N native-format content items in a single
-- atomic call. Inserts N rows in public.content_items and N-1 rows in
-- public.content_relationships (a STAR topology: the first item is the hub; each
-- subsequent item links to it as a 'sibling' edge). Pillar defaults to the idea's
-- pillar; title defaults to the idea's title. Raised exceptions roll back the entire
-- block — partial writes are impossible.
--
-- security invoker: runs as the caller. RLS on ideas/content_items/content_relationships
-- enforces ownership; cross-user spawn attempts return NOT_FOUND, never another user's row.
-- p_specs shape (validated client-side by SpawnSiblingsSchema and again here):
--   [{ title?: string, format: text, platform_id?: uuid, pillar_id?: uuid }, …]
-- Length must be in [2, 12].
create or replace function public.spawn_sibling_content_items(
  p_idea_id uuid,
  p_specs jsonb
)
returns setof public.content_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_idea public.ideas;
  v_spec_count int;
  v_spec jsonb;
  v_inserted_ids uuid[] := array[]::uuid[];
  v_inserted_id uuid;
  v_hub_id uuid;
  v_default_pillar uuid;
  v_idx int;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  -- RLS evaluates on this select; an idea the caller doesn't own simply isn't found.
  select * into v_idea from public.ideas where id = p_idea_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  v_spec_count := jsonb_array_length(p_specs);
  if v_spec_count < 2 then
    raise exception 'TOO_FEW_SPECS' using errcode = 'P0001';
  end if;
  if v_spec_count > 12 then
    raise exception 'TOO_MANY_SPECS' using errcode = 'P0001';
  end if;

  v_default_pillar := v_idea.pillar_id;

  -- Insert items in input order; index 0 becomes the hub of the sibling star.
  for v_idx in 0 .. v_spec_count - 1 loop
    v_spec := p_specs -> v_idx;

    insert into public.content_items (
      user_id, idea_id, platform_id, pillar_id, title, format, status
    ) values (
      v_user_id,
      p_idea_id,
      nullif(v_spec ->> 'platform_id', '')::uuid,
      coalesce(nullif(v_spec ->> 'pillar_id', '')::uuid, v_default_pillar),
      coalesce(nullif(v_spec ->> 'title', ''), v_idea.title),
      v_spec ->> 'format',
      'idea'
    )
    returning id into v_inserted_id;

    v_inserted_ids := array_append(v_inserted_ids, v_inserted_id);
    if v_idx = 0 then
      v_hub_id := v_inserted_id;
    end if;
  end loop;

  -- Sibling star: hub -> each spoke. Postgres arrays are 1-indexed.
  for v_idx in 1 .. v_spec_count - 1 loop
    insert into public.content_relationships (
      user_id, parent_id, child_id, relationship_type
    ) values (
      v_user_id,
      v_hub_id,
      v_inserted_ids[v_idx + 1],
      'sibling'
    );
  end loop;

  return query
    select * from public.content_items
    where id = any (v_inserted_ids)
    order by created_at asc;
end;
$$;

grant execute on function public.spawn_sibling_content_items(uuid, jsonb) to authenticated;
