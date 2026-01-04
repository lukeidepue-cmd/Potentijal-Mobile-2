// providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { syncUserToLoops } from '../lib/api/loops';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: { username?: string; display_name?: string }) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  signInWithOAuth: (provider: 'apple' | 'google') => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Supabase auth error:', error);
      } else {
        console.log('✅ Supabase connected successfully. Session:', session ? 'Active' : 'No session');
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { username?: string; display_name?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    // If sign-up successful, sync to Loops (non-blocking)
    if (!error && data.user) {
      // Sync user to Loops in the background (don't wait for it)
      syncUserToLoops({
        email: data.user.email || email,
        firstName: metadata?.display_name?.split(' ')[0] || metadata?.username,
        lastName: metadata?.display_name?.split(' ').slice(1).join(' '),
        userId: data.user.id,
      }).then(({ error: loopsError }) => {
        if (loopsError) {
          console.warn('⚠️ [Loops] Failed to sync user:', loopsError);
        } else {
          console.log('✅ [Loops] User synced successfully - Welcome email will be sent via Journey if configured');
          // Welcome email is sent automatically via Loops Journey when contact is added
          // No need to call sendWelcomeEmail() - it's handled by the Journey
        }
      });
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const signInWithOAuth = async (provider: 'apple' | 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${Constants.expoConfig?.scheme || 'myfirstapp'}://`,
      },
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

