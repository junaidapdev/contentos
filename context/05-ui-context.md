# UI Context

This file sets the design direction. The implementing chunks (starting Chunk 01) finalize the exact
tokens and components; this is the intent they must honor.

## Visual Style

Clean, **content-dense but not cluttered** — closer to Notion or Linear than to a marketing site.
The user is a solo creator running an operation, not a team staring at a dashboard. Density is tuned
for someone scanning **20–40 content items at once** on the calendar view without feeling
overwhelmed. Whitespace is deliberate, chrome is minimal, and information wins over decoration.

## Colors

- **Base:** Tailwind's `neutral` scale for surfaces, borders, and text.
- **Accent:** a single accent color. Candidate is `violet-600` or `indigo-600`; the implementing
  chunk finalizes the choice. One accent only — no rainbow UI.
- **Semantic status colors** map to the content lifecycle:
  - `idea` → `neutral-500`
  - `drafting` → `amber-500`
  - `ready` → `sky-500`
  - `scheduled` → `violet-500`
  - `published` → `emerald-500`

  These status colors are documented here and **defined as CSS custom properties or Tailwind theme
  extensions in Chunk 01**. Feature code references the tokens, never raw hex.

## Typography

- **UI font:** Inter, or the system font stack as fallback.
- **Monospace:** for code and inline IDs.
- **Scale:** Tailwind defaults. Page titles are `text-2xl font-semibold`; secondary copy is
  `text-sm text-muted-foreground`.

## Layout Rules

- A global **`AppShell`** wraps the app: a sidebar nav plus a content area.
- **Calendar view:** occupies the full content area with no card chrome — it is the dense surface.
- **Forms:** `max-w-2xl`, centered.
- **Lists:** `max-w-5xl` or full-width depending on density.
- **Mobile:** the sidebar collapses to a hamburger and the content area goes full-width.

## Component Behavior

- **shadcn/ui primitives by default.** Don't hand-roll what shadcn already provides.
- **Form pattern:** shadcn `Form` + a Zod resolver + inline `<FormMessage>` for field errors.
- **Buttons during async work** disable themselves and show busy text (e.g., "Saving…"); they
  **never disappear**. Layout must not shift when a button enters its busy state.
- **Optional enum selects** show a "Clear selection" affordance so a user can unset an optional
  field.

## Loading States

Use **skeleton loaders** for lists, the calendar, and dashboards — shapes that match the content
that's coming. A bare spinner alone on an empty screen is not acceptable.

## Empty States

Every list has a **designed empty state**, not an afterthought. Each empty state has three parts:

1. an icon,
2. a one-sentence explanation, and
3. a primary CTA that moves the user forward (e.g., "+ New idea").

## Error States

- **Mutation errors:** a destructive shadcn `<Alert>` showing the **mapped user-facing message**
  (from the relevant `messages.ts`), never a raw error object.
- **Unhandled exceptions:** a full-page **error boundary**.
- **Network errors:** include a **"Retry"** action.

## Accessibility Baseline

- Every input has a label.
- Focus rings are visible — never `outline: none` without a replacement.
- Keyboard tab order is logical.
- Async controls set `aria-busy` while working.
- Color contrast meets **WCAG AA**. Status colors must remain distinguishable for color-blind users
  (pair color with text/icon, never color alone).
