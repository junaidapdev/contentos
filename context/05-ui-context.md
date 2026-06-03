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

## Visual Consistency Audit Checklist

Locked in Chunk 12. Apply to every new screen.

- **Spacing.** Tailwind's 4-step rhythm: `gap-2` / `gap-4` / `gap-8` / `gap-16` (and `mt-2`/`mt-4`/etc.).
  Skip `gap-3` / `gap-5` / `gap-6` unless inheriting from a third-party component.
- **Button variants.** `default` / `outline` / `ghost` / `destructive`. No new variants.
- **Heading scale.**
  - `h1` = `text-2xl font-semibold` (the `<PageHeader>` enforces this).
  - `h2` = `text-xl font-medium` (detail-page sections).
  - `h3` = `text-lg font-medium` (sub-sections).
- **Card padding.** `p-4` (16px) or `p-6` (24px). No `p-5`.
- **Icon size.** `size-4` (16px) inline in buttons; `size-5` (20px) in headers and section titles.
- **Toasts.** Bottom-right desktop, bottom-center mobile. Success 3s, error 5s. Max 3 stacked, dismissable.
- **Empty states.** Max-width ~480px, center-aligned. **Exactly one primary CTA** (or one primary + one
  secondary for the documented two-CTA case — see `decisions.md`).
- **Skeleton loaders.** Structural placeholders matching the eventual content shape. A bare spinner is
  acceptable only for brief route transitions (`FullPageLoader`).
- **Error states.** Full-panel `<ErrorState>` for query failures; inline destructive `<Alert>` for
  mutation failures. Network errors get the distinct `<NetworkErrorState>`.
- **Color is never the sole carrier of meaning.** Status badges include the label; cross-post "Missing"
  pills have dashed border + label; cadence indicators include arrow/check glyph; calendar chips have
  `aria-label` carrying status name.
- **Mobile baseline.** Every screen works at **375px** width without horizontal scroll.

## Feedback Primitives

Locked in Chunk 12. Shared components live in `/frontend/src/components/feedback/`:

- **`<EmptyState>`** — designed empty state with icon, title, body, and primary (+ optional secondary)
  CTA. Used by every list page.
- **`<SkeletonList>`** — vertical stack of skeleton rows. Default 5 rows, default `h-[76px]`.
- **`<SkeletonCard>`** — panel-shaped skeleton with `kind: 'panel' | 'form' | 'chart'`.
- **`<SkeletonForm>`** — label + input + helper, repeated. Used on detail-page initial fetch.
- **`<ErrorState>`** — full-panel error treatment with optional retry button + error code.
- **`<NetworkErrorState>`** — distinct visual treatment for `TypeError: Failed to fetch` style
  failures (see `lib/network-error.ts`). Retry is always offered.
- **`<PageHeader>`** — standardized page header with `<h1>`, optional subtitle, optional breadcrumbs,
  optional right-aligned actions. The `useFocusOnRouteChange` hook focuses this `<h1>` on navigation.

Toast wrapper (`lib/toast.ts`) wraps sonner with project defaults — feature code imports `toast` from
the wrapper, not directly from `sonner`. Global error boundary (`components/RouteErrorBoundary.tsx`)
wraps `<Outlet />` inside `<AppShell>`.
