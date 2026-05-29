create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Canonical platform identifiers. Add new ones here as new platforms are supported.
  slug text not null check (slug in ('youtube','instagram','linkedin','x','substack','blog','tiktok','threads','newsletter')),
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create trigger platforms_updated_at
before update on public.platforms
for each row execute function public.set_updated_at();

create index platforms_user_active_idx on public.platforms (user_id, is_active);

alter table public.platforms enable row level security;

create policy "platforms_self_all"
  on public.platforms for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
