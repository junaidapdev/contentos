-- Lifecycle state machine, server side. Mirrors the transition table in
-- _shared/schemas/content-item.ts (CONTENT_ITEM_STATUS_TRANSITIONS) — keep both in sync.
-- security invoker: runs as the caller, so RLS on content_items enforces ownership. A user
-- calling this with someone else's id sees zero rows (NOT_FOUND), never another user's data.
create or replace function public.update_content_item_status(
  p_item_id uuid,
  p_new_status text,
  p_scheduled_for timestamptz default null,
  p_published_at timestamptz default null
)
returns public.content_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current public.content_items;
  v_allowed text[];
  v_result public.content_items;
begin
  -- RLS evaluates on this select; a row the caller doesn't own simply isn't found.
  select * into v_current from public.content_items where id = p_item_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Allowed transition table — mirrors the Zod source of truth.
  v_allowed := case v_current.status
    when 'idea'      then array['drafting','ready']
    when 'drafting'  then array['idea','ready']
    when 'ready'     then array['drafting','scheduled','published']
    when 'scheduled' then array['ready','published']
    when 'published' then array[]::text[]
    else array[]::text[]
  end;

  if p_new_status <> v_current.status and not (p_new_status = any (v_allowed)) then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  if p_new_status = 'scheduled' and p_scheduled_for is null then
    raise exception 'SCHEDULED_REQUIRES_DATE' using errcode = 'P0001';
  end if;
  if p_new_status = 'published' and p_published_at is null then
    raise exception 'PUBLISHED_REQUIRES_DATE' using errcode = 'P0001';
  end if;

  update public.content_items
    set status = p_new_status,
        scheduled_for = case when p_new_status = 'scheduled' then p_scheduled_for else scheduled_for end,
        published_at  = case when p_new_status = 'published' then p_published_at  else published_at end
    where id = p_item_id
    returning * into v_result;

  return v_result;
end;
$$;

-- Authenticated users may call it; RLS on the underlying table enforces row ownership.
grant execute on function public.update_content_item_status(uuid, text, timestamptz, timestamptz) to authenticated;
