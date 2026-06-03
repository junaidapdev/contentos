import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  DASHBOARD_WINDOW_OPTIONS,
  DEFAULT_DASHBOARD_WINDOW,
  type DashboardWindowValue,
} from './dashboard-constants';

const VALID_VALUES = new Set<string>(DASHBOARD_WINDOW_OPTIONS.map((o) => o.value));

// URL-state-backed window selector. Mirrors the calendar's filter-hook pattern (Chunk 08):
// URL is the source of truth, default value is NOT serialized into the URL, invalid input
// silently falls back to the default.
export function useDashboardWindowParam(): {
  windowValue: DashboardWindowValue;
  setWindowValue: (value: DashboardWindowValue) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const windowValue: DashboardWindowValue = useMemo(() => {
    const raw = searchParams.get('window');
    if (raw && VALID_VALUES.has(raw)) {
      return raw as DashboardWindowValue;
    }
    return DEFAULT_DASHBOARD_WINDOW;
  }, [searchParams]);

  const setWindowValue = useCallback(
    (value: DashboardWindowValue): void => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === DEFAULT_DASHBOARD_WINDOW) {
            next.delete('window');
          } else {
            next.set('window', value);
          }
          // Avoid redundant navigation when a control emits the same value repeatedly.
          return next.toString() === prev.toString() ? prev : next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  return { windowValue, setWindowValue };
}
