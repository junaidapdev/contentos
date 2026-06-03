-- Chunk 06: cross-post spawning. Given a source content item that has a platform set, create N
-- new platform-specific variants of the same asset in one atomic call. Inserts N rows in
-- public.content_items (each on a distinct target platform) and N rows in
-- public.content_relationships (cross_post: source -> child). Title/format/idea_id/pillar_id/notes
-- are copied verbatim from the source; status starts at 'idea' on every child (each variant is a
-- fresh draft on its own platform). The cross-post group conceptually includes the source plus
-- its children; the source is its own first variant (no self-edge: the table's
-- parent_id <> child_id check forbids it).
--
-- security invoker: RLS on ideas/content_items/content_relationships scopes everything to the
-- caller. Cross-user spawn attempts (caller doesn't own the source) return NOT_FOUND.
--
-- Validation layered with the client-side Zod CrossPostSpawnSchema (1..20 platforms):
--   * SOURCE_LACKS_PLATFORM             — source has no platform_id (cross-posting needs per-platform tracking).
--   * NO_TARGET_PLATFORMS / TOO_MANY_PLATFORMS — array length out of [1, 20].
--   * TARGET_INCLUDES_SOURCE_PLATFORM   — a target platform equals the source's own platform.
--   * INVALID_PLATFORM                  — a target platform_id isn't one the caller owns.
--   * PLATFORM_ALREADY_COVERED          — a target platform is already covered by the source or an existing child.
create or replace function public.spawn_cross_post_variants(
  p_source_item_id uuid,
  p_target_platform_ids uuid[]
)
returns setof public.content_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.content_items;
  v_target_count int;
  v_target_platform_id uuid;
  v_inserted_ids uuid[] := array[]::uuid[];
  v_inserted_id uuid;
  v_existing_platforms uuid[];
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Locate source via RLS-evaluated select; a source the caller doesn't own simply isn't found.
  select * into v_source from public.content_items where id = p_source_item_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Source must have a platform; without one, the cross-post group has no anchor.
  if v_source.platform_id is null then
    raise exception 'SOURCE_LACKS_PLATFORM' using errcode = 'P0001';
  end if;

  -- Input bounds.
  v_target_count := coalesce(array_length(p_target_platform_ids, 1), 0);
  if v_target_count < 1 then
    raise exception 'NO_TARGET_PLATFORMS' using errcode = 'P0001';
  end if;
  if v_target_count > 20 then
    raise exception 'TOO_MANY_PLATFORMS' using errcode = 'P0001';
  end if;

  -- A target platform can't be the source's own (the source IS that variant).
  if v_source.platform_id = any (p_target_platform_ids) then
    raise exception 'TARGET_INCLUDES_SOURCE_PLATFORM' using errcode = 'P0001';
  end if;

  -- Every target platform must belong to the caller (defense in depth alongside RLS).
  -- The count comparison catches both "platform doesn't exist" and "platform belongs to someone else".
  perform 1 from public.platforms
    where user_id = v_user_id and id = any (p_target_platform_ids)
    group by 1 having count(*) = v_target_count;
  if not found then
    raise exception 'INVALID_PLATFORM' using errcode = 'P0001';
  end if;

  -- Gather already-covered platforms (the source's own + existing cross-post children of the source).
  select array_agg(platform_id) into v_existing_platforms
  from (
    select v_source.platform_id as platform_id
    union
    select ci.platform_id
      from public.content_items ci
      join public.content_relationships cr on cr.child_id = ci.id
      where cr.parent_id = p_source_item_id
        and cr.relationship_type = 'cross_post'
  ) covered
  where covered.platform_id is not null;

  -- Reject if any target platform is already covered.
  if v_existing_platforms is not null
     and exists (select 1 from unnest(p_target_platform_ids) tp where tp = any (v_existing_platforms))
  then
    raise exception 'PLATFORM_ALREADY_COVERED' using errcode = 'P0001';
  end if;

  -- Insert one content_item per target platform, copying source fields. Each child also gets a
  -- cross_post relationship row from source -> child. The partial unique index on (user_id,
  -- child_id) where relationship_type='cross_post' ensures a child can't be re-added to another
  -- cross-post group later, even via a separate call.
  foreach v_target_platform_id in array p_target_platform_ids loop
    insert into public.content_items (
      user_id, idea_id, platform_id, pillar_id, title, format, status, notes
    ) values (
      v_user_id,
      v_source.idea_id,
      v_target_platform_id,
      v_source.pillar_id,
      v_source.title,
      v_source.format,
      'idea',
      v_source.notes
    )
    returning id into v_inserted_id;

    v_inserted_ids := array_append(v_inserted_ids, v_inserted_id);

    insert into public.content_relationships (
      user_id, parent_id, child_id, relationship_type
    ) values (
      v_user_id, p_source_item_id, v_inserted_id, 'cross_post'
    );
  end loop;

  return query
    select * from public.content_items
    where id = any (v_inserted_ids)
    order by created_at asc;
end;
$$;

grant execute on function public.spawn_cross_post_variants(uuid, uuid[]) to authenticated;
