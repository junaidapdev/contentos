# Chunk 12 — Pre-work Audit Notes

These notes were captured by walking every screen in the app and identifying
the loading / empty / error / mobile / accessibility / consistency rough edges
that this chunk will smooth. Each section lists what is present today and what
the chunk-12 polish pass will change.

The screens fall into three buckets:

- **Auth + onboarding** — public routes and the wizard.
- **Signed-in shell** — sidebar nav + the six feature areas.
- **Cross-cutting** — toasts, dialogs, popovers, forms.

## /sign-in (`features/auth/SignInPage.tsx`)

- Loading: ☑ ok — `FullPageLoader` covers the auth-check window.
- Error: ☑ ok — inline destructive `<Alert>` + `toast.error`; mapped copy via `authErrorMessage`. Wrong-password produces a clear "Invalid email or password" string via `authMessages.signIn.errors.INVALID_CREDENTIALS`.
- Empty: n/a — pure form.
- Mobile (375px): ☑ ok — `max-w-md` card centers; form stacks naturally.
- Accessibility: focus on the heading is not managed (no `useFocusOnRouteChange` yet); contrast OK; tab order OK; required-mark uses sr-only text.
- Inconsistencies: no `<h1>` in the markup (the card title uses `CardTitle` which is `h4`-like) — fix by adding a visually-hidden or explicit `h1` so `useFocusOnRouteChange` has a target.

## /sign-up (`features/auth/SignUpPage.tsx`)

- Loading: ☑ ok — same `FullPageLoader` pattern.
- Error: ☑ ok — destructive `<Alert>` + toast; mapped via `authErrorMessage`.
- Empty: n/a.
- Mobile (375px): ☑ ok.
- Accessibility: same heading issue as sign-in — no `<h1>`.
- Inconsistencies: as above.

## /onboarding (`features/onboarding/OnboardingPage.tsx`)

- Loading: ☐ rough — each step renders without any skeleton if `usePlatforms` / `usePillars` are in flight; the user briefly sees an empty list.
- Error: ☐ rough — query errors fall through silently in a couple of places; should surface a panel-level `<ErrorState>` with retry.
- Empty: n/a (wizard).
- Mobile (375px): ☑ ok — the steps stack.
- Accessibility: stepper at the top has aria-current but no announcement on step change; back/next focus ring OK.
- Inconsistencies: page-level `<h1>` exists per step; good. But each step page also uses bespoke spacing — fold into `<PageHeader>` for consistency.

## /dashboard (`features/dashboard/DashboardPage.tsx`)

- Loading: ☐ rough — uses raw `<Skeleton className="h-64 w-full rounded-lg" />` blocks at the page level (lines 76-79). Should use `<SkeletonCard kind="panel" />`.
- Error: ☐ rough — single page-level `<Alert>` works but is not a full-panel `<ErrorState>` (which is what the standard prescribes for query failures).
- Empty: ☐ partially rough — `DashboardEmptyState` already exists with the two-CTA pattern; refactor into the new shared `<EmptyState>` with the documented `primaryCta` + `secondaryCta` pattern.
- Mobile (375px): ☐ rough — `grid lg:grid-cols-2` collapses fine but the cadence table inside `CadenceTrackingPanel` has fixed columns and overflows horizontally at 375px. Add a `<div className="overflow-x-auto">` already in place but the table widths still cause cramping; needs `min-w-0` on the panel container.
- Accessibility: cadence rows have icon + color, but the indicator pill uses color alone for `on_target` / `under` / `over` (the label is present — actually OK, just verify on each row).
- Inconsistencies: page header is bespoke `DashboardHeader` — keep that (it carries the window selector), but rename heading typography to match other pages (already `text-2xl font-semibold`, good).

## /calendar (`features/calendar/CalendarPage.tsx`)

- Loading: ☐ partially rough — the `GridSkeleton` is good; the agenda side panel falls back to a single `<Skeleton className="h-40 w-full" />` (line 153) which is a bare strip, not a list-shaped skeleton.
- Error: ☐ rough — single inline `<Alert>` at the page top; for a full-page calendar this should be a full-panel `<ErrorState>` so the user can clearly retry.
- Empty: ☑ ok — `CalendarEmptyState` exists with filtered/unfiltered variants. Migrate to shared `<EmptyState>`.
- Mobile (375px): ☑ mostly ok — grid does shrink; chips truncate; agenda toggle works. But the chip in a cell at 375px width is uncomfortably narrow — verify the indicators don't overflow.
- Accessibility: ☑ good — chips have `aria-label` carrying status name + platform + time; popovers focus-trap (Radix); overflow popover is keyboard-reachable.
- Inconsistencies: page heading uses `text-2xl font-semibold` ✓.

## /ideas (list)

- Loading: ☐ rough — 5 raw `<Skeleton>` blocks at `h-[76px]`. Replace with `<SkeletonList rowCount={5} rowHeight="h-[76px]" />`.
- Error: ☐ rough — inline `<Alert>` with retry. Switch to full-panel `<ErrorState>` for query failures (the spec says full-panel for queries, inline `<Alert>` for mutations — list-page is a query).
- Empty: ☑ ok — local `EmptyState` component already matches the pattern. Migrate to shared `<EmptyState>`.
- Mobile: ☑ ok.
- Accessibility: page `<h1>` present ✓.

## /ideas/new

- Loading: n/a.
- Error: mutation error → toast, no panel needed. ✓
- Empty: n/a.
- Mobile: ☑ ok — `IdeaForm` is `max-w-2xl`.
- Accessibility: needs verification of focus to `<h1>`.

## /ideas/:id

- Loading: ☐ rough — three sections (form, spawn panel, spawned items) — currently each loads independently with skeleton hits but the page-level layout is bespoke. Add consistent `<SkeletonCard>` blocks during initial fetch.
- Error: ☐ rough — query errors surface as inline alerts. Page-level idea-load error should be `<ErrorState>`.
- Empty: n/a.
- Mobile: ☑ ok mostly.
- Accessibility: AlertDialog (delete) — confirm Cancel-first focus (shadcn default focuses cancel ✓).

## /content-items (list)

- Loading: ☐ rough — same `<Skeleton className="h-[76px]" />` array.
- Error: ☐ rough — inline alert.
- Empty: ☑ ok — filtered vs unfiltered variants present in copy ✓.
- Mobile: ☑ mostly ok but filter row could wrap better at 375px.
- Accessibility: page `<h1>` present.

## /content-items/new

- Loading: skeleton during platforms/pillars/ideas data load.
- Error: ☐ if pre-fill query params reference deleted entities, currently silent — acceptable.
- Empty: n/a.
- Mobile: ☑ ok.
- Accessibility: form pattern OK.

## /content-items/:id

- Loading: ☐ rough — each panel (form, siblings, cross-posts, repurposing) has its own loading/empty/error treatment. Some use bare skeleton blocks. Migrate all to shared primitives.
- Error: distinct treatments — `CrossPostGroupPanel` uses inline `<Alert>`, repurposing uses similar. Standardize.
- Empty: each panel has its own copy — keep specific copy but consider using `<EmptyState>` for the empty-children case.
- Mobile: ☑ mostly ok.
- Accessibility: status badges paired with text ✓; Missing pill paired with text + dashed border ✓.

## /brand-context

- Loading: ☐ rough — 4 raw skeleton blocks.
- Error: inline `<Alert>` with retry.
- Empty: ☑ ok — local `EmptyState` matches pattern.
- Mobile: ☑ ok.
- Accessibility: page `<h1>` present.

## /brand-context/new

- Loading: n/a in create mode.
- Mobile: ☑ ok.
- Accessibility: body textarea has a character counter — needs `aria-live` to announce approaching the 20k cap.

## /brand-context/:id

- Loading: ☐ rough — bare skeleton during fetch.
- Error: needs full-panel error state.
- Mobile: ☑ ok.
- Accessibility: as above (character counter).

## /brand-context/export

- Loading: ☐ rough — file picker shows raw skeletons during load; preview dialog has no skeleton.
- Error: minor — render-failure handling exists; selection state is responsive.
- Empty: composer shows guidance when zero files selected.
- Mobile: ☐ rough — copy + download buttons can wrap awkwardly; needs verification at 375px.
- Accessibility: preview dialog focus trap ✓; close button reachable.

## Cross-cutting

### Sidebar nav (`layouts/AppShell.tsx`)

- Active link: ☐ rough — uses background tint alone (color-only) for active. Add a left border accent (per spec decisions).
- Mobile: ☐ rough — sidebar is fixed 240px and doesn't collapse to a hamburger. **High-priority polish item.**
- Sign-out: ☑ always at the bottom of the sidebar.
- Logo: placeholder text "ContentEngine" — ok for now.

### Toasts

- Position: bottom-right by sonner default ✓; need to wire mobile bottom-center.
- Duration: not standardized — some `toast.success(msg)` calls use default 4s; some are shorter. Standardize: 3s success, 5s error.
- Max stacked: not capped — sonner default is unlimited.
- Imports: feature code imports `toast` directly from `sonner`. Wrap into `lib/toast.ts` so we can adjust defaults centrally.

### Dialogs

- AlertDialog usage: DeleteIdeaDialog, DeleteContentItemDialog, DeleteBrandContextFileDialog — Cancel-focused-first (shadcn default) ✓; copy explicit about cascade ✓. Audit for missing question-form title.
- Dialog usage: AddCrossPostDialog, AddRepurposedChildrenDialog, ExportPackPreview, SuggestSiblingSpecsDialog — focus trap (Radix) ✓.

### Popovers

- CalendarChipPopover, CalendarOverflowPopover — Radix handles focus trap. Verified by inspection.

### Forms

- Submit button labels: mostly verb+noun ("Create idea", "Save changes") but a couple of generic "Save" / "Submit" linger. Standardize: "Create idea", "Save changes", "Spawn N items", "Add cross-posts", etc.
- Busy text: present-progressive ("Creating…", "Saving…") used inconsistently. Audit all forms.

### Error boundary

- ☐ MISSING — no global error boundary exists. A `throw` inside a feature takes down the whole app. Add `<RouteErrorBoundary>` wrapping `<Outlet />` in `AppShell`.

### Network errors

- ☐ MISSING — no distinct treatment for `TypeError: Failed to fetch`. Currently surfaces as generic `INTERNAL_ERROR`. Add `lib/network-error.ts` helper and `<NetworkErrorState>`.

### Focus management on route change

- ☐ MISSING — no `useFocusOnRouteChange`. Page transitions leave focus on the link the user clicked. Add the hook + wire into `AppShell`.

### `<h1>` on every page

- Most pages have `<h1>`; auth and onboarding miss it consistently. Adding `<PageHeader>` standardizes this.

## Concrete polish items (count: 18+, comfortably above the spec's "10" floor)

1. Add `<RouteErrorBoundary>` wrapping `<Outlet />` in `AppShell`.
2. Add `useFocusOnRouteChange` hook + wire to `AppShell`.
3. Add `lib/toast.ts` wrapper; migrate all feature code from direct sonner imports.
4. Wire sonner defaults (position, duration, max stacked, close button) in `main.tsx`.
5. Add mobile bottom-center toast position (CSS-based wrap).
6. Add `lib/network-error.ts` + `<NetworkErrorState>` distinct from `<ErrorState>`.
7. Add `<EmptyState>` shared primitive with primary + optional secondary CTA.
8. Add `<SkeletonList>` / `<SkeletonCard>` / `<SkeletonForm>` shared primitives.
9. Add `<ErrorState>` shared primitive.
10. Add `<PageHeader>` shared primitive with `<h1>`.
11. Add `feedback-tokens.ts` for shared dimensions.
12. AppShell mobile hamburger drawer (375px).
13. AppShell active-link left-border accent (no color-alone).
14. Dashboard: refactor to shared primitives.
15. Calendar: agenda skeleton + full-panel error state.
16. Ideas list/detail: shared skeleton list + full-panel error state.
17. Content items list/detail: shared skeleton + full-panel error states.
18. Brand context list/detail/export: shared skeletons + char-counter aria-live.
19. Forms: button-label audit (verb+noun, present-progressive busy).
20. Auth/onboarding: add `<h1>` via `<PageHeader>` or visually-hidden heading so focus-on-route-change has a target.

This is the work plan for the chunk.
