// providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { syncUserToLoops } from '../lib/api/loops';
import { needsOnboarding } from '../lib/api/onboarding';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needsOnboarding: boolean | null;
  onboardingLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: { username?: string; display_name?: string }) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  signInWithOAuth: (provider: 'apple' | 'google') => Promise<{ error: any }>;
  signInWithOtp: (email: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string) => Promise<{ data: any; error: any }>;
  refreshOnboardingStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboardingStatus, setNeedsOnboardingStatus] = useState<boolean | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  // Check onboarding status for current user
  const checkOnboardingStatus = useCallback(async () => {
    if (!user) {
      setNeedsOnboardingStatus(null);
      return;
    }

    setOnboardingLoading(true);
    const { data, error } = await needsOnboarding();
    if (error) {
      setNeedsOnboardingStatus(null);
    } else {
      setNeedsOnboardingStatus(data);
    }
    setOnboardingLoading(false);
  }, [user]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check onboarding status after session is loaded
      if (session?.user) {
        checkOnboardingStatus();
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check onboarding status when user signs in/out
      if (session?.user) {
        checkOnboardingStatus();
      } else {
        setNeedsOnboardingStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Re-check onboarding status when user changes
  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    } else {
      setNeedsOnboardingStatus(null);
    }
  }, [user, checkOnboardingStatus]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Check onboarding status after successful sign-in
    if (!error) {
      // Wait a moment for user state to update, then check onboarding
      setTimeout(() => {
        checkOnboardingStatus();
      }, 100);
    }
    
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

    // If sign-up successful, sync to Loops (non-blocking) and check onboarding
    if (!error && data.user) {
      // Sync user to Loops in the background (don't wait for it)
      syncUserToLoops({
        email: data.user.email || email,
        firstName: metadata?.display_name?.split(' ')[0] || metadata?.username,
        lastName: metadata?.display_name?.split(' ').slice(1).join(' '),
        userId: data.user.id,
      }).then(() => {});

      // Check onboarding status for new user (will be true for new sign-ups)
      setTimeout(() => {
        checkOnboardingStatus();
      }, 100);
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

  // Sign in with OTP (works for both sign-up and sign-in automatically)
  // Sends a 6-digit code to the user's email
  const signInWithOtp = async (email: string) => {
    // IMPORTANT: Do NOT include emailRedirectTo - that triggers magic links
    // Without emailRedirectTo, Supabase sends an OTP code
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Allow creating new users during signup
        shouldCreateUser: true,
        // Explicitly do NOT set emailRedirectTo - this forces OTP codes
      },
    });
    
    return { error };
  };

  // Verify OTP code
  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    
    if (!error && data?.session && data.user) {
      const userCreatedAt = new Date(data.user.created_at);
      const secondsSinceCreation = (Date.now() - userCreatedAt.getTime()) / 1000;
      if (secondsSinceCreation < 30) {
        const metadata = data.user.user_metadata || {};
        const displayName = metadata.display_name || metadata.full_name || '';
        syncUserToLoops({
          email: data.user.email || email,
          firstName: displayName.split(' ')[0] || metadata.username || undefined,
          lastName: displayName.split(' ').slice(1).join(' ') || undefined,
          userId: data.user.id,
        }).then(() => {});
      }
      setTimeout(() => checkOnboardingStatus(), 100);
    }
    return { data, error };
  };

  const refreshOnboardingStatus = async () => {
    await checkOnboardingStatus();
  };

  const value = {
    user,
    session,
    loading,
    needsOnboarding: needsOnboardingStatus,
    onboardingLoading,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    signInWithOtp,
    verifyOtp,
    refreshOnboardingStatus,
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

