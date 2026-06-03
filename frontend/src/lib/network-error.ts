import { ERROR_CODES, type ErrorCode } from '@/constants/error-codes';

// Distinguishes a transport-layer failure (the browser couldn't reach the server) from any
// other error. When `fetch()` cannot resolve — offline, DNS failure, CORS preflight blocked,
// server unreachable — the browser throws a `TypeError` whose message starts with "Failed to
// fetch" (Chromium / Firefox / Safari all use this phrasing).
//
// Treating these as distinct from VALIDATION_FAILED / NOT_FOUND etc. lets the UI offer a
// retry — which makes sense for transport failures and doesn't for semantic ones.
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    // Browser-specific phrasings, all containing "fetch":
    //   Chrome:  "Failed to fetch"
    //   Firefox: "NetworkError when attempting to fetch resource."
    //   Safari:  "Load failed" (no "fetch") — falls through below
    if (message.includes('fetch')) return true;
    if (message.includes('networkerror')) return true;
    if (message.includes('load failed')) return true;
  }
  // Stable string-error-code throwers (mutation hooks) use ERROR_CODES.NETWORK_ERROR directly.
  if (typeof error === 'string' && error === ERROR_CODES.NETWORK_ERROR) return true;
  return false;
}

// Convenience for the (very common) "is this error the unmapped network case OR an actual
// network code thrown by a mutation hook?" question — feature pages call this to pick between
// <NetworkErrorState> and <ErrorState>.
export function toUiErrorCode(error: unknown): ErrorCode {
  if (isNetworkError(error)) return ERROR_CODES.NETWORK_ERROR;
  if (typeof error === 'string') {
    // Narrow against the known set. If the string is one of our codes, return it.
    const known = Object.values(ERROR_CODES) as readonly string[];
    if (known.includes(error)) return error as ErrorCode;
  }
  return ERROR_CODES.INTERNAL_ERROR;
}
