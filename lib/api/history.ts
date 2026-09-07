/**
 * History Tab API
 * Functions for fetching workouts, practices, and games history
 */

import { supabase } from '../supabase';
import { getWorkoutWithDetails, type WorkoutDetails } from './workouts';

export interface HistoryWorkout {
  id: string;
  name: string;
  mode: string;
  performed_at: string;
  /** Color key of the first preset used in this workout. Drives the date
   *  kicker tint on the History card. Null when the workout has no preset-
   *  linked exercises (legacy workouts, or all-legacy exercise kinds). */
  presetColor?: string | null;
}

/** Fetch the preset color for each workout id. Uses a single join through
 *  workout_exercises → exercise_presets. Returns a Map keyed by workout id;
 *  workouts with multiple presets get the FIRST preset color encountered.
 *  Workouts with no preset-linked exercises are absent from the Map. */
async function fetchWorkoutPresetColors(workoutIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (workoutIds.length === 0) return out;
  try {
    const { data, error } = await supabase
      .from('workout_exercises')
      .select('workout_id, preset:exercise_presets(color)')
      .in('workout_id', workoutIds)
      .not('preset_id', 'is', null);
    if (error || !data) return out;
    for (const row of data as Array<{ workout_id: string; preset: any }>) {
      // PostgREST nested join returns either an object or an array (legacy);
      // coerce defensively.
      const preset = Array.isArray(row.preset) ? row.preset[0] : row.preset;
      const color = preset?.color;
      if (color && !out.has(row.workout_id)) {
        out.set(row.workout_id, color);
      }
    }
  } catch {
    // Swallow — color is cosmetic, never block the history list because of it.
  }
  return out;
}

export interface HistoryPractice {
  id: string;
  mode: string;
  practiced_at: string;
  title?: string | null;
  drill?: string | null;
  notes?: string | null;
}

export interface HistoryGame {
  id: string;
  mode: string;
  played_at: string;
  result: 'win' | 'loss' | 'tie';
  title?: string | null;
  notes?: string | null;
  stats?: string | Record<string, any> | null; // Can be stored as jsonb (object) or text (string)
}

export interface HistoryStats {
  total: number;
  streak: number;
}

// Helper function to format date from ISO string
function fmtDateFromISO(iso: string) {
  const parts = iso.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}/${String(year).slice(-2)}`;
  }
  return iso;
}

/**
 * List workouts for the current user's history tab.
 * Always uses the authenticated user's id (no optional userId) to prevent BOLA/IDOR.
 * For viewing another user's profile, use listWorkoutsForProfile({ profileId }).
 */
export async function listWorkouts(params: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ data: HistoryWorkout[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let query = supabase
      .from('workouts')
      .select('id, name, mode, performed_at, created_at')
      .eq('user_id', user.id)
      .order('performed_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }
    if (params.search) {
      query = query.ilike('name', `%${params.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const workouts = data || [];
    // Decorate with the first preset color per workout (used by the History
    // card's date kicker). Cosmetic — failure here is silently ignored.
    const colors = await fetchWorkoutPresetColors(workouts.map(w => w.id));
    const decorated: HistoryWorkout[] = workouts.map(w => ({
      ...w,
      presetColor: colors.get(w.id) ?? null,
    }));
    return { data: decorated, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * List workouts for a specific profile (for viewing other users' profiles)
 */
export async function listWorkoutsForProfile(params: {
  profileId: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: HistoryWorkout[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let query = supabase
      .from('workouts')
      .select('id, name, mode, performed_at, created_at')
      .eq('user_id', params.profileId)
      .order('performed_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const workouts = data || [];
    const colors = await fetchWorkoutPresetColors(workouts.map(w => w.id));
    const decorated: HistoryWorkout[] = workouts.map(w => ({
      ...w,
      presetColor: colors.get(w.id) ?? null,
    }));
    return { data: decorated, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get detailed workout data
 */
export async function getWorkoutDetail(workoutId: string): Promise<{ data: WorkoutDetails | null; error: any }> {
  return getWorkoutWithDetails(workoutId);
}

/**
 * List practices for the current user's history tab.
 * Always uses the authenticated user's id (no optional userId) to prevent BOLA/IDOR.
 * For viewing another user's profile, use listPracticesForProfile({ profileId }).
 */
export async function listPractices(params: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ data: HistoryPractice[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let query = supabase
      .from('practices')
      .select('id, mode, practiced_at, title, drill, notes, created_at')
      .eq('user_id', user.id)
      .order('practiced_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }
    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,drill.ilike.%${params.search}%,notes.ilike.%${params.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * List practices for a specific profile (for viewing other users' profiles).
 */
export async function listPracticesForProfile(params: {
  profileId: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: HistoryPractice[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let query = supabase
      .from('practices')
      .select('id, mode, practiced_at, title, drill, notes, created_at')
      .eq('user_id', params.profileId)
      .order('practiced_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get detailed practice data
 */
export async function getPracticeDetail(practiceId: string): Promise<{ data: HistoryPractice | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('practices')
      .select('id, mode, practiced_at, title, drill, notes')
      .eq('id', practiceId)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * List games for the current user's history tab.
 * Always uses the authenticated user's id (no optional userId) to prevent BOLA/IDOR.
 * For viewing another user's profile, use listGamesForProfile({ profileId }).
 */
export async function listGames(params: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ data: HistoryGame[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let query = supabase
      .from('games')
      .select('id, mode, played_at, result, title, notes, stats, created_at')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }
    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,notes.ilike.%${params.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * List games for a specific profile (for viewing other users' profiles).
 */
export async function listGamesForProfile(params: {
  profileId: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: HistoryGame[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let query = supabase
      .from('games')
      .select('id, mode, played_at, result, title, notes, stats, created_at')
      .eq('user_id', params.profileId)
      .order('played_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get detailed game data
 */
export async function getGameDetail(gameId: string): Promise<{ data: HistoryGame | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('games')
      .select('id, mode, played_at, result, title, notes, stats')
      .eq('id', gameId)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get history statistics
 */
export async function getHistoryStats(params: {
  kind: 'workouts' | 'practices' | 'games';
}): Promise<{ data: HistoryStats | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let tableName: string;
    let dateColumn: string;
    let additionalFilter: any = {};

    switch (params.kind) {
      case 'workouts':
        tableName = 'workouts';
        dateColumn = 'performed_at';
        // Don't add is_finalized filter here - we'll handle it gracefully
        break;
      case 'practices':
        tableName = 'practices';
        dateColumn = 'practiced_at';
        break;
      case 'games':
        tableName = 'games';
        dateColumn = 'played_at';
        break;
      default:
        return { data: null, error: { message: 'Invalid kind' } };
    }

    // Get total count
    let countQuery = supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Apply additional filters (skip is_finalized for workouts - handle in app layer)
    Object.entries(additionalFilter).forEach(([key, value]) => {
      if (key !== 'is_finalized') {
        countQuery = countQuery.eq(key, value);
      }
    });

    const { count, error: countError } = await countQuery;

    if (countError) {
      return { data: null, error: countError };
    }

    const total = count || 0;

    // Calculate streak (consecutive days with at least one entry)
    let streakQuery = supabase
      .from(tableName)
      .select(dateColumn)
      .eq('user_id', user.id)
      .order(dateColumn, { ascending: false })
      .limit(30);

    Object.entries(additionalFilter).forEach(([key, value]) => {
      if (key !== 'is_finalized') {
        streakQuery = streakQuery.eq(key, value);
      }
    });

    const { data: recentEntries, error: streakError } = await streakQuery;

    if (streakError) {
      return { data: null, error: streakError };
    }

    let streak = 0;
    if (recentEntries && recentEntries.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dates = new Set(
        recentEntries.map((entry: any) => {
          const date = new Date(entry[dateColumn]);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
      );

      // Start counting from today if today has a workout, otherwise start from yesterday
      // This ensures the streak doesn't reset to 0 until the day ends
      let currentDate = new Date(today);
      if (!dates.has(currentDate.getTime())) {
        // Today doesn't have a workout, start counting from yesterday
        currentDate.setDate(currentDate.getDate() - 1);
      }
      
      // Count consecutive days with workouts
      while (dates.has(currentDate.getTime())) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    streak = Math.min(streak, 999); // Cap at 999

    return { data: { total, streak }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}
