create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_id uuid references public.ideas(id) on delete set null,
  platform_id uuid references public.platforms(id) on delete set null,
  pillar_id uuid references public.content_pillars(id) on delete set null,
  title text not null check (char_length(title) between 1 and 300),
  format text not null check (format in ('post','thread','reel','short','video','newsletter','blog_post','story','other')),
  status text not null check (status in ('idea','drafting','ready','scheduled','published')),
  scheduled_for timestamptz,
  published_at timestamptz,
  published_url text check (published_url is null or char_length(published_url) <= 500),
  notes text check (notes is null or char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Status transition guards: scheduled requires scheduled_for; published requires published_at.
  check (status <> 'scheduled' or scheduled_for is not null),
  check (status <> 'published' or published_at is not null)
);

create trigger content_items_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

create index content_items_user_scheduled_idx on public.content_items (user_id, scheduled_for);
create index content_items_user_status_idx on public.content_items (user_id, status);
create index content_items_user_idea_idx on public.content_items (user_id, idea_id);
create index content_items_user_platform_idx on public.content_items (user_id, platform_id);
create index content_items_user_pillar_idx on public.content_items (user_id, pillar_id);
create index content_items_user_updated_idx on public.content_items (user_id, updated_at desc);

alter table public.content_items enable row level security;

create policy "content_items_self_all"
  on public.content_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
