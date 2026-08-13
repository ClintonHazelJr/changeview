import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*, accounts(name)')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) {
      // Soft-deactivated users must not keep a session even if Auth ban lags.
      if (data.is_active === false) {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
        return null;
      }
      setProfile(data);
      return data;
    }
    setProfile(null);
    return null;
  }, []);

  // Trigger should create rows on signup; this recovers if it was missing.
  const ensureProvisioned = useCallback(async (userId) => {
    const existing = await loadProfile(userId);
    if (existing) return existing;

    const { error } = await supabase.rpc('ensure_account_for_user');
    if (error) {
      console.error('Account provisioning failed:', error.message);
      return null;
    }
    return loadProfile(userId);
  }, [loadProfile]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (cancelled) return;
      setSession(s);
      if (s?.user) await ensureProvisioned(s.user.id);
      if (!cancelled) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // Defer so we don't deadlock with auth lock; still provision on login/signup.
        setTimeout(() => {
          ensureProvisioned(s.user.id);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [ensureProvisioned]);

  const signUp = async ({
    email, password, fullName, accountName, planTier = 'solo', billingCycle = 'monthly',
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          account_name: accountName || `${fullName}'s Account`,
          plan_tier: planTier,
          billing_cycle: billingCycle,
        },
      },
    });
    if (error) throw error;
    if (data.session?.user) {
      await ensureProvisioned(data.session.user.id);
    }
    return data;
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.user) {
      await ensureProvisioned(data.session.user.id);
    }
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = () => session?.user && ensureProvisioned(session.user.id);

  return (
    <AuthContext.Provider value={{
      session, profile, loading, signUp, signIn, signOut, refreshProfile,
      user: session?.user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
