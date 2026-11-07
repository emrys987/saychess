import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database, Profile } from '@/types/database';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  updateProfile: (changes: ProfileUpdate) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

type LoadedProfile = { userId: string; profile: Profile | null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  // Profil, ait olduğu kullanıcıyla birlikte tutulur; kullanıcı değişince eski profil otomatik geçersiz olur.
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      setSession(initial);
      setSessionReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchProfile(userId)
      .catch((err) => {
        console.warn('Profil alınamadı', err);
        return null;
      })
      .then((profile) => {
        if (!cancelled) setLoaded({ userId, profile });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const profile = userId && loaded?.userId === userId ? loaded.profile : null;
  const loading = !sessionReady || (!!userId && loaded?.userId !== userId);

  const updateProfile = useCallback(
    async (changes: ProfileUpdate) => {
      if (!userId) throw new Error('Oturum yok');
      const { data, error } = await supabase
        .from('profiles')
        .update(changes)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      setLoaded({ userId, profile: data });
    },
    [userId],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, updateProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}
