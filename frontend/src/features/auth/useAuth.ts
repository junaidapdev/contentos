import { useSyncExternalStore } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

// Module-level singleton store. All `useAuth()` callers share the same state and the same
// auth-state-change subscription. Without this, every consumer mounted its own listener and
// transitioned through `user = null → user = X` independently, which raced the
// `useOnboardingStatus` query key (`['onboarding-status', user?.id]`) and triggered a
// /onboarding ↔ /dashboard redirect loop via `RequireOnboarded` (chunk-13 launch test).
//
// See React's `useSyncExternalStore` API — the canonical way to subscribe a component to an
// external store while remaining concurrent-safe. The snapshot is referentially stable between
// updates (only mutated inside `notify()`) so React's tearing-detection is satisfied.

let cachedState: AuthState = { user: null, session: null, isLoading: true };
const listeners = new Set<() => void>();
let initialized = false;

function notify(): void {
  for (const listener of listeners) listener();
}

function ensureInit(): void {
  if (initialized) return;
  initialized = true;

  // First read: seed from the persisted session. Supabase's `getSession()` resolves from
  // localStorage without a network call when a session is present.
  void supabase.auth.getSession().then(({ data }) => {
    cachedState = {
      user: data.session?.user ?? null,
      session: data.session,
      isLoading: false,
    };
    notify();
  });

  // Subsequent updates: token refresh, sign in, sign out. Supabase fires an INITIAL_SESSION
  // event shortly after subscription with the current session; treating that the same as any
  // other update is correct and idempotent.
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedState = {
      user: session?.user ?? null,
      session,
      isLoading: false,
    };
    notify();
  });
}

function subscribe(listener: () => void): () => void {
  ensureInit();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AuthState {
  return cachedState;
}

// Context-free auth hook. Every consumer reads the same shared `cachedState` and re-renders
// together when auth changes — no more per-consumer loading-state races.
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
