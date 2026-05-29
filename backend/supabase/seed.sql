-- ContentEngine demo seed — LOCAL DEVELOPMENT ONLY. Runs automatically on `supabase db reset`.
-- Production never runs seed.sql. Inserting directly into auth.users is a local-dev convenience so
-- later chunks have queryable data; for seeding against a real signed-up account use
-- scripts/seed-demo-data.sh instead.
--
-- The dataset deliberately exercises all three content relationship types:
--   sibling         — one idea -> LinkedIn post + X thread + YouTube video
--   repurposed_from — the YouTube video -> an Instagram reel
--   cross_post      — that Instagram reel -> a TikTok short (same asset, two platforms)

begin;

-- Demo auth user (fixed id). The on_auth_user_created trigger auto-creates public.profiles.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'demo@contentengine.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Demo Creator"}'::jsonb,
  now(), now()
);

update public.profiles
  set display_name = 'Demo Creator'
  where id = '00000000-0000-0000-0000-000000000001';

-- Platforms
insert into public.platforms (id, user_id, slug, display_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'youtube',   'YouTube'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001', 'linkedin',  'LinkedIn'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000001', 'x',         'X'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000001', 'instagram', 'Instagram'),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000001', 'tiktok',    'TikTok');

-- Pillars
insert into public.content_pillars (id, user_id, name, description, sort_order) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', 'Education',          'Teach the core skill.', 0),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000001', 'Behind the scenes',  'Process and personal.', 1);

-- Cadence targets (weekly)
insert into public.cadence_targets (id, user_id, platform_id, weekly_target) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 3),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a3', 5),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 1);

-- Idea
insert into public.ideas (id, user_id, title, notes, pillar_id) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000001',
   'Launch announcement for the new course',
   'Announce the cohort. Lead with the transformation, not the curriculum.',
   '00000000-0000-0000-0000-0000000000c1');

-- Content items
--   b1/b2/b3 are siblings spawned from idea e1 (different native formats).
--   b4 is repurposed from b3 (long-form video -> reel). b5 is a cross-post of b4 (reel -> short).
insert into public.content_items
  (id, user_id, idea_id, platform_id, pillar_id, title, format, status, scheduled_for, published_at, published_url) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1',
   'Course launch — LinkedIn post', 'post', 'ready', null, null, null),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1',
   'Course launch — X thread', 'thread', 'drafting', null, null, null),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1',
   'Course launch — YouTube video', 'video', 'scheduled', now() + interval '7 days', null, null),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-000000000001',
   null, '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c2',
   'Course launch — Instagram reel', 'reel', 'published', null, now() - interval '2 days', 'https://instagram.com/p/demo-reel'),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-000000000001',
   null, '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c2',
   'Course launch — TikTok short', 'short', 'published', null, now() - interval '2 days', 'https://tiktok.com/@demo/video/demo');

-- Relationships (one row per logical edge; the app treats siblings symmetrically at query time)
insert into public.content_relationships (id, user_id, parent_id, child_id, relationship_type) values
  -- siblings from idea e1 (canonical = the LinkedIn post b1)
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'sibling'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b3', 'sibling'),
  -- long-form YouTube video (b3) repurposed into the Instagram reel (b4)
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b4', 'repurposed_from'),
  -- the reel (b4) cross-posted as a TikTok short (b5)
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000b5', 'cross_post');

-- Brand context files
insert into public.brand_context_files (id, user_id, kind, title, body) values
  ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-000000000001', 'voice',
   'Brand voice', 'Direct, warm, no hype. Short sentences. Teach by example.'),
  ('00000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-000000000001', 'audience',
   'Audience', 'Solo creators with 2-5 platforms who feel scattered and want one command center.');

commit;
