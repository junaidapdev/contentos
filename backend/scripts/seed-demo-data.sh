#!/usr/bin/env bash
# Seed a demo content graph for an EXISTING signed-up user (resolved by email). Use this when you
# want demo data attached to the account you actually log in with in the app, rather than the fixed
# demo user that seed.sql creates on `supabase db reset`. Idempotent — safe to re-run.
#
# Usage: scripts/seed-demo-data.sh <user-email>
set -euo pipefail

EMAIL="${1:-}"
[ -n "$EMAIL" ] || { echo "usage: $0 <user-email>" >&2; exit 1; }

eval "$(supabase status -o env | grep -E '^DB_URL=')"
DB="${DB_URL:?could not read DB_URL from supabase status — is the stack running?}"

USER_ID="$(psql "$DB" -At -c "select id from auth.users where email = '${EMAIL//\'/}' limit 1;")"
[ -n "$USER_ID" ] || { echo "No user found with email '$EMAIL'. Sign up in the app first." >&2; exit 1; }
echo "Seeding demo data for $EMAIL ($USER_ID)..."

psql "$DB" -v ON_ERROR_STOP=1 -v uid="$USER_ID" <<'SQL'
-- Platforms + pillars (idempotent on their unique constraints).
insert into public.platforms (user_id, slug, display_name) values
  (:'uid','youtube','YouTube'), (:'uid','linkedin','LinkedIn'), (:'uid','x','X'),
  (:'uid','instagram','Instagram'), (:'uid','tiktok','TikTok')
on conflict (user_id, slug) do nothing;

insert into public.content_pillars (user_id, name, description, sort_order) values
  (:'uid','Education','Teach the core skill.',0),
  (:'uid','Behind the scenes','Process and personal.',1)
on conflict (user_id, name) do nothing;

-- Content graph: one idea -> 3 sibling items; the video repurposed into a reel; the reel cross-posted
-- as a short. Only inserts when the demo idea is not already present (so re-runs are no-ops).
with idea as (
  insert into public.ideas (user_id, title, notes, pillar_id)
  select :'uid', 'Launch announcement for the new course', 'Lead with the transformation.',
         (select id from public.content_pillars where user_id = :'uid' and name = 'Education')
  where not exists (
    select 1 from public.ideas where user_id = :'uid' and title = 'Launch announcement for the new course'
  )
  returning id
),
li as (
  insert into public.content_items (user_id, idea_id, platform_id, title, format, status)
  select :'uid', (select id from idea),
         (select id from public.platforms where user_id = :'uid' and slug = 'linkedin'),
         'Course launch — LinkedIn post', 'post', 'ready'
  where exists (select 1 from idea) returning id
),
xt as (
  insert into public.content_items (user_id, idea_id, platform_id, title, format, status)
  select :'uid', (select id from idea),
         (select id from public.platforms where user_id = :'uid' and slug = 'x'),
         'Course launch — X thread', 'thread', 'drafting'
  where exists (select 1 from idea) returning id
),
yt as (
  insert into public.content_items (user_id, idea_id, platform_id, title, format, status, scheduled_for)
  select :'uid', (select id from idea),
         (select id from public.platforms where user_id = :'uid' and slug = 'youtube'),
         'Course launch — YouTube video', 'video', 'scheduled', now() + interval '7 days'
  where exists (select 1 from idea) returning id
),
reel as (
  insert into public.content_items (user_id, platform_id, title, format, status, published_at, published_url)
  select :'uid', (select id from public.platforms where user_id = :'uid' and slug = 'instagram'),
         'Course launch — Instagram reel', 'reel', 'published', now() - interval '2 days', 'https://instagram.com/p/demo'
  where exists (select 1 from idea) returning id
),
short as (
  insert into public.content_items (user_id, platform_id, title, format, status, published_at, published_url)
  select :'uid', (select id from public.platforms where user_id = :'uid' and slug = 'tiktok'),
         'Course launch — TikTok short', 'short', 'published', now() - interval '2 days', 'https://tiktok.com/@demo/v'
  where exists (select 1 from idea) returning id
)
insert into public.content_relationships (user_id, parent_id, child_id, relationship_type)
select :'uid', p, c, t
from (
  select (select id from li) as p, (select id from xt)   as c, 'sibling'::text          as t
  union all select (select id from li),   (select id from yt),   'sibling'
  union all select (select id from yt),   (select id from reel), 'repurposed_from'
  union all select (select id from reel), (select id from short),'cross_post'
) edges
where p is not null and c is not null;
SQL

echo "Done."
