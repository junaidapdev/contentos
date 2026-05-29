create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  notes text check (char_length(notes) <= 5000),
  pillar_id uuid references public.content_pillars(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ideas_updated_at
before update on public.ideas
for each row execute function public.set_updated_at();

create index ideas_user_updated_idx on public.ideas (user_id, updated_at desc);
create index ideas_user_pillar_idx on public.ideas (user_id, pillar_id);

alter table public.ideas enable row level security;

create policy "ideas_self_all"
  on public.ideas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
