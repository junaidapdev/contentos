-- Chunk 11: observability log for AI proxy requests. NOT user-facing — no UI reads it; it exists
-- so the developer can monitor cost, latency, and error rates, and so the proxy can enforce
-- per-user rate limits (count rows in the trailing minute / day). Bodies are NEVER stored — only
-- sizes, timing, success/error. The Edge Function inserts rows via the service role (which
-- bypasses RLS by design); the SELECT policy lets a user read their own rows but the absence of
-- INSERT/UPDATE/DELETE policies means no client JWT can write or mutate the log.
create table public.ai_request_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task text not null check (char_length(task) between 1 and 100),
  request_size_chars int not null check (request_size_chars >= 0),
  response_size_chars int not null check (response_size_chars >= 0),
  success boolean not null,
  error_code text,
  latency_ms int not null check (latency_ms >= 0),
  created_at timestamptz not null default now()
);

-- (user_id, created_at desc) backs observability reads; (user_id, created_at) backs the
-- rate-limit window count (>= now() - interval). Both prefixed on user_id so RLS filters on the
-- index prefix.
create index ai_request_log_user_created_idx on public.ai_request_log (user_id, created_at desc);
create index ai_request_log_user_window_idx on public.ai_request_log (user_id, created_at);

alter table public.ai_request_log enable row level security;

-- SELECT only. No insert/update/delete policy → client JWTs cannot write or tamper. The Edge
-- Function's service-role client bypasses RLS for its inserts + rate-limit reads.
create policy "ai_request_log_self_select"
  on public.ai_request_log for select
  using (auth.uid() = user_id);
