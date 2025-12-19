// lib/api/practices.ts
// API functions for practice logging

import { supabase } from '../supabase';
import { SportMode, mapModeKeyToSportMode } from '../types';

export interface PracticeData {
  id: string;
  mode: SportMode;
  practicedAt: string;
  drill: string | null;
  notes: string | null;
}

/**
 * Create a practice entry
 */
export async function createPractice(params: {
  mode: SportMode | string;
  practicedAt: string; // ISO date string
  drill: string;
  notes?: string;
}): Promise<{ data: string | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const sportMode = typeof params.mode === 'string' 
      ? mapModeKeyToSportMode(params.mode) 
      : params.mode;

    const { data, error } = await supabase
      .from('practices')
      .insert({
        user_id: user.id,
        mode: sportMode,
        practiced_at: params.practicedAt,
        drill: params.drill.trim(),
        notes: params.notes?.trim() || null,
      })
      .select('id')
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data.id, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get a practice by ID
 */
export async function getPractice(practiceId: string): Promise<{ data: PracticeData | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('practices')
      .select('id, mode, practiced_at, drill, notes')
      .eq('id', practiceId)
      .single();

    if (error) {
      return { data: null, error };
    }

    return {
      data: {
        id: data.id,
        mode: data.mode as SportMode,
        practicedAt: data.practiced_at,
        drill: data.drill,
        notes: data.notes,
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}


