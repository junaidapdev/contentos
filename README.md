# ContentEngine

ContentEngine is a content operations command center for solo creators who publish across
multiple platforms (YouTube, Instagram, LinkedIn, X, newsletters). It is **not** an AI writing
tool. It is a planning, tracking, repurposing, and brand-context workspace whose unique angle is
multi-platform visibility, content relationships (sibling content from one idea, cross-posts of one
asset, repurposed children from long-form parents), cadence tracking, and exportable brand context
packs.

## Repo Layout

```
contentengine/
├── README.md            ← you are here (human overview)
├── CLAUDE.md            ← routing pointer for Claude Code
├── AGENTS.md            ← routing pointer for Cursor / Codex / Windsurf / others
├── .gitignore
├── context/            ← durable instruction layer (read this first)
│   ├── 01-project-overview.md
│   ├── 02-architecture.md
│   ├── 03-code-standards.md
│   ├── 04-ai-workflow-rules.md
│   ├── 05-ui-context.md
│   ├── 06-progress-tracker.md
│   ├── agents.md
│   └── decisions.md
├── feature-specs/      ← one Markdown spec per shippable chunk
│   └── README.md
├── frontend/           ← Vite + React SPA (scaffolded in Chunk 01)
└── backend/            ← Supabase project (scaffolded in Chunk 02)
```

## Quickstart

- **If you are an AI agent:** read `/context/agents.md` first. It is the master instruction file
  and routes you through the rest of the context folder and the active feature spec.
- **If you are a human:** read `/context/01-project-overview.md` for what ContentEngine is, who it
  is for, and what the MVP includes.

## Tech Stack

Vite + React SPA, Supabase (Postgres + Auth + Edge Functions), deployed independently.

## Status

MVP in development. See `/context/06-progress-tracker.md` for current progress.
