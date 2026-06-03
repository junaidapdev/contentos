import { logger } from '@/lib/logger';

// Writes text to the clipboard. Must be called from a user-initiated event handler (click) —
// browsers reject clipboard writes outside a user gesture. Returns false (rather than throwing)
// when the API is unavailable or the write is denied, so callers can show a graceful fallback
// toast. Never logs the text content — only the failure event.
export async function copyToClipboard(text: string): Promise<boolean> {
  // The DOM lib types `navigator.clipboard` as always-present, so an explicit availability guard
  // trips no-unnecessary-condition. At runtime it IS undefined in insecure (http) contexts and
  // older browsers — accessing `.writeText` there throws synchronously, which the try/catch below
  // catches. Either failure mode (unavailable OR denied) returns false; callers show the same
  // graceful fallback toast.
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    logger.error('clipboard_write_failed', { error: String(err) });
    return false;
  }
}
