// Shared dimensions for feedback primitives so the loading/empty/error vocabulary stays
// visually consistent. Each token is a Tailwind class string; consumers compose with `cn`.
//
// Why this lives in its own module rather than next to each component:
//   - it is referenced by EmptyState, ErrorState, NetworkErrorState, and the skeleton family,
//   - keeping the literals here makes "bump every empty state's max-width" a one-line edit.
//
// See /context/05-ui-context.md "Feedback primitives" for usage guidance.

export const FEEDBACK_TOKENS = {
  /** Max width of the centered text column inside an EmptyState / ErrorState. */
  EMPTY_STATE_MAX_WIDTH: 'max-w-md',
  /** Vertical padding around a full-panel EmptyState. */
  EMPTY_STATE_PADDING: 'py-16',
  /** Default row height for SkeletonList (matches the list-row height used across features). */
  SKELETON_ROW_HEIGHT_DEFAULT: 'h-[76px]',
  /** Vertical padding around a full-panel ErrorState. */
  ERROR_STATE_PADDING: 'py-12',
} as const;
