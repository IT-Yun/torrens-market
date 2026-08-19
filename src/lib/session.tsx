import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  suburb: string | null;
  suburb_verified_at: string | null;
  nationality: string | null;
  preferred_language: 'ko' | 'en' | 'zh';
  is_phone_verified: boolean;
  tos_accepted_at: string | null;
};

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string, retry = 1) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if ((error || !data) && retry > 0) {
      // Cold-start fetches can race the token refresh — one retry prevents an
      // onboarded user from being bounced to profile setup.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return fetchProfile(userId, retry - 1);
    }
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await fetchProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next) await fetchProfile(next.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (session) await fetchProfile(session.user.id);
  };

  return (
    <SessionContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
