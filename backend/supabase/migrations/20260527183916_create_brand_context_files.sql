create table public.brand_context_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('voice','audience','offers','platform_rules','do_dont','examples','other')),
  title text not null check (char_length(title) between 1 and 200),
  body  text not null check (char_length(body) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger brand_context_files_updated_at
before update on public.brand_context_files
for each row execute function public.set_updated_at();

create index brand_context_files_user_kind_idx on public.brand_context_files (user_id, kind);

alter table public.brand_context_files enable row level security;

create policy "brand_context_files_self_all"
  on public.brand_context_files for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
