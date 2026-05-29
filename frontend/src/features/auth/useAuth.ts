import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

// Context-free auth hook: seeds from the persisted session, then tracks Supabase auth-state changes.
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
  });

  useEffect(() => {
    let active = true;

    const init = async (): Promise<void> => {
      const { data } = await supabase.auth.getSession();
      if (active) {
        setState({
          user: data.session?.user ?? null,
          session: data.session,
          isLoading: false,
        });
      }
    };
    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, isLoading: false });
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
