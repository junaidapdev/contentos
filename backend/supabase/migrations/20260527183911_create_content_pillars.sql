create table public.content_pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 500),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create trigger content_pillars_updated_at
before update on public.content_pillars
for each row execute function public.set_updated_at();

create index content_pillars_user_sort_idx on public.content_pillars (user_id, sort_order);

alter table public.content_pillars enable row level security;

create policy "content_pillars_self_all"
  on public.content_pillars for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
