# Project Overview

## What ContentEngine Is

ContentEngine is a **content operations command center** for solo creators who publish across
multiple platforms — YouTube, Instagram, LinkedIn, X, and newsletters. It is a planning, tracking,
repurposing, and brand-context workspace. Its job is to give one person a single place to see
everything they are making, what state each piece is in, how it relates to everything else, and
whether they are keeping up with their own publishing cadence.

ContentEngine is explicitly **not an AI writing tool** and is not positioned as an "AI content
planner." It does not generate your posts for you, and AI is not the product. The product is
**multi-platform visibility plus content relationships**: seeing one idea fan out into native posts
across platforms, seeing one asset cross-posted to several places, and seeing long-form work
repurposed into smaller children — all on one timeline, with cadence and pillar balance in view.

If a future feature touches AI at all (see Chunk 11), it is a convenience layer around an
**exportable brand context pack** the creator can paste into Claude, ChatGPT, or Cursor — the
creator's own tools, not ours. The writing happens wherever the creator already writes.

## Who It Is For

Solo creators with **2–5 active platforms** who are past the "do I have anything to post" stage and
squarely in the "I have too much in too many places" stage. Concretely:

- Founders building a personal brand alongside a company.
- Freelancers living on LinkedIn + X.
- YouTubers repurposing long-form video into shorts and newsletter sections.
- Newsletter writers expanding into social.
- Educators and coaches running an audience.
- Solopreneurs juggling content with everything else.

It is **not** for absolute beginners with zero content, and it is **not** for teams. There are no
seats, no assignment, no approval workflows, no shared inboxes. One creator, one operation.

## The Core Problem Solved

> "I have ideas, drafts, reels, posts, newsletters, and platform versions scattered everywhere. I
> don't know what is planned, what is drafted, what is scheduled, what is posted, and what I'm
> missing."

The pain is **fragmentation and loss of state**. Content lives in Notes apps, Google Docs, platform
draft folders, DMs to oneself, and memory. There is no single surface that answers "what is the
status of everything, and how does it all connect." ContentEngine is that surface.

## Core Flows

The primary end-to-end journey:

1. **Set up platforms and cadence** — enable the platforms you actually use; set a weekly or daily
   target per platform.
2. **Define pillars** — name the recurring themes your content ladders up to.
3. **Create an idea** — capture the parent concept once.
4. **Spawn sibling content items across formats** — turn one idea into a LinkedIn post, an X thread,
   a YouTube video, a reel, and a newsletter section, each as its own trackable item.
5. **Track lifecycle** — move each item through `Idea → Drafting → Ready → Scheduled → Published`.
6. **Group cross-posts of the same asset** — when the same finished asset goes to multiple
   platforms, group those versions.
7. **Link repurposed children to long-form parents** — connect the shorts and clips back to the
   long-form video or essay they came from.
8. **Export a brand context pack** — bundle voice, audience, offer, platform rules, and examples into
   a file you paste into Claude / ChatGPT / Cursor when you actually write.

## MVP Scope

The MVP delivers twelve capabilities, grouped here for clarity. (Item count is fixed at twelve;
the grouping is presentational.)

**Setup & configuration**
1. Per-user **platform setup** — enable platforms and configure their display.
2. Per-platform **cadence targets** — weekly/daily target counts.
3. **Content pillars** — per-user themes content is tagged against.

**Idea & content creation**
4. **Ideas** — the parent concept that spawns content.
5. **Content items** with an explicit **lifecycle** (`Idea → Drafting → Ready → Scheduled →
   Published`).
6. **Sibling spawning** — create multiple native-format items from one idea in a few clicks.

**Relationships**
7. **Cross-post grouping** — the same asset across multiple platforms (relationship type A).
8. **Repurposed-from linking** — long-form parent to repurposed children (relationship type C).

**Visibility & tracking**
9. **Calendar view** — scheduled and published content on a timeline, dense enough to scan 20–40
   items at once.
10. **Cadence tracking** — am I hitting my per-platform targets this week?
11. **Pillar balance** — is my output skewed toward one theme?

**Brand context**
12. **Brand context files + exportable pack** — reusable voice/audience/offer/platform-rules/examples
    content, exportable as a single pack.

## Out of Scope for MVP

- **Auto-publishing** to platform APIs. ContentEngine tracks state; it does not push to platforms.
- **Deep AI generation** inside the app. No in-app ghostwriting; the brand context pack feeds the
  creator's own AI tools instead.
- **Team features.** No multiple seats, roles, assignment, or approvals.
- **Analytics dashboards** beyond cadence and pillar balance. No follower graphs, no engagement
  analytics, no platform metric ingestion.
- **Mobile apps.** Responsive web only; native apps are out.

## Tech Stack

- **Frontend:** Vite + React + TypeScript (strict) + Tailwind + shadcn/ui + React Router + React
  Query + Zod. SPA only.
- **Backend:** Supabase — Postgres + Auth + Storage + Edge Functions (Deno).
- **Deployment:** the two halves deploy **independently** — the frontend to Vercel/Netlify, the
  backend via the Supabase CLI.

See `02-architecture.md` for how these pieces fit together and `03-code-standards.md` for the rules
that govern the code.

## Three Relationship Types

ContentEngine's differentiator is that content is **connected**, not just listed. There are exactly
three kinds of connection. Later chunks refer back to this section by these letters and by the
`relationship_type` enum values defined in `02-architecture.md`.

- **(A) Same asset, multiple platforms** — one finished asset (e.g., a single graphic or a single
  short video) posted to several platforms. Enum value: `cross_post`.
- **(B) Same idea, different native formats (siblings)** — one idea expressed as genuinely different
  native pieces (a thread, a reel, a newsletter section), each authored for its platform. Enum
  value: `sibling`.
- **(C) Repurposed from long-form (parent → children)** — a long-form parent (a YouTube video, a
  newsletter essay) broken down into smaller repurposed children (clips, quote posts, carousels).
  Enum value: `repurposed_from`.

These three relationships are modeled by the `content_relationships` table described in
`02-architecture.md`.
