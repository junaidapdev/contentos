create table public.cadence_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete cascade,
  -- weekly target count of items for this platform; daily is derived in the UI.
  weekly_target int not null check (weekly_target >= 0 and weekly_target <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform_id)
);

create trigger cadence_targets_updated_at
before update on public.cadence_targets
for each row execute function public.set_updated_at();

create index cadence_targets_user_idx on public.cadence_targets (user_id);

alter table public.cadence_targets enable row level security;

create policy "cadence_targets_self_all"
  on public.cadence_targets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
