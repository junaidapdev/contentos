create table public.content_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid not null references public.content_items(id) on delete cascade,
  child_id  uuid not null references public.content_items(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('sibling','cross_post','repurposed_from')),
  created_at timestamptz not null default now(),
  -- Prevent self-relationships and duplicate edges.
  check (parent_id <> child_id),
  unique (user_id, parent_id, child_id, relationship_type)
);

create index content_relationships_user_parent_idx on public.content_relationships (user_id, parent_id);
create index content_relationships_user_child_idx  on public.content_relationships (user_id, child_id);
create index content_relationships_user_type_idx   on public.content_relationships (user_id, relationship_type);

alter table public.content_relationships enable row level security;

create policy "content_relationships_self_all"
  on public.content_relationships for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
