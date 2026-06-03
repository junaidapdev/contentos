// Conversions for <input type="datetime-local">, which shows/produces local wall-clock
// "YYYY-MM-DDTHH:mm" (no timezone) while the DB stores tz-aware ISO. Form state holds ISO so the
// @shared z.iso.datetime() validators apply directly.

const pad = (n: number): string => String(n).padStart(2, '0');

// ISO (e.g. "2026-05-29T14:30:00+00:00") -> datetime-local "YYYY-MM-DDTHH:mm" in the user's locale.
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// datetime-local "YYYY-MM-DDTHH:mm" (parsed as local time) -> tz-aware ISO string, or null if empty.
export function localInputToIso(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

// Local-time "YYYY-MM-DD" for the given date (defaults to now). Used by the brand-context export
// pack header + download filename. Impure by default (reads `new Date()`); pass a date for
// deterministic callers.
export function localDateString(date: Date = new Date()): string {
  return `${pad(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ISO -> short human label for lists/detail (e.g. "May 29, 2026, 2:30 PM").
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ISO -> relative "updated" label (e.g. "2h ago", "3d ago").
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${pad(minutes)}m ago`.replace(/^0/, '');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(iso);
}
