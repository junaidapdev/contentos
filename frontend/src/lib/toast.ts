import { toast as sonnerToast } from 'sonner';

// Project-wide toast wrapper. Feature code imports `toast` from here, NOT directly from `sonner`,
// so per-project defaults (durations, etc.) live in one place. The chunk-12 decisions lock these:
//   - success: 3 seconds (short, stateless confirmation)
//   - error:   5 seconds (longer, descriptive, dismissable)
//   - info:    3 seconds
//
// Stack cap (max 3), close button, and position are configured on the <Toaster /> in main.tsx —
// those are Toaster-level props, not per-toast options.

const DURATION_SUCCESS_MS = 3000;
const DURATION_ERROR_MS = 5000;
const DURATION_INFO_MS = 3000;

export const toast = {
  success: (message: string): void => {
    sonnerToast.success(message, { duration: DURATION_SUCCESS_MS });
  },
  error: (message: string): void => {
    sonnerToast.error(message, { duration: DURATION_ERROR_MS });
  },
  info: (message: string): void => {
    sonnerToast.info(message, { duration: DURATION_INFO_MS });
  },
  /**
   * Escape hatch — pass through to sonner for the rare case where a caller needs a non-standard
   * duration (e.g., a copy-to-clipboard confirmation that should linger). Use sparingly; the
   * standardized helpers above cover ~99% of cases.
   */
  custom: sonnerToast,
};
