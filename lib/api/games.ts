// lib/api/games.ts
// API functions for game logging

import { supabase } from '../supabase';
import { SportMode, GameResult, mapModeKeyToSportMode } from '../types';

export interface GameData {
  id: string;
  mode: SportMode;
  playedAt: string;
  result: GameResult | null;
  title: string | null;
  stats: Record<string, number | string>;
  notes: string | null;
}

/**
 * Create a game entry
 */
export async function createGame(params: {
  mode: SportMode | string;
  playedAt: string; // ISO date string
  result: 'win' | 'loss' | 'tie';
  title?: string;
  stats: Record<string, number | string>;
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

    // Build insert data, handling optional title column gracefully
    const insertData: any = {
      user_id: user.id,
      mode: sportMode,
      played_at: params.playedAt,
      result: params.result,
      stats: params.stats,
      notes: params.notes || null,
    };
    
    // Only add title if provided (column might not exist in older schemas)
    if (params.title?.trim()) {
      insertData.title = params.title.trim();
    }

    const { data, error } = await supabase
      .from('games')
      .insert(insertData)
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
 * Get a game by ID
 */
export async function getGame(gameId: string): Promise<{ data: GameData | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('id, mode, played_at, result, title, stats, notes')
      .eq('id', gameId)
      .single();

    if (error) {
      return { data: null, error };
    }

    return {
      data: {
        id: data.id,
        mode: data.mode as SportMode,
        playedAt: data.played_at,
        result: data.result as GameResult | null,
        title: data.title,
        stats: data.stats as Record<string, number | string>,
        notes: data.notes,
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}


