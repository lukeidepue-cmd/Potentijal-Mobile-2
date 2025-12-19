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
}

export interface HistoryPractice {
  id: string;
  mode: string;
  practiced_at: string;
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
  stats?: string | null; // Stored as text, not jsonb
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
 * List workouts with optional fuzzy search
 */
export async function listWorkouts(params: {
  search?: string;
  limit?: number;
}): Promise<{ data: HistoryWorkout[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let query = supabase
      .from('workouts')
      .select('id, name, mode, performed_at, is_finalized, created_at')
      .eq('user_id', user.id)
      .order('performed_at', { ascending: false })
      .order('created_at', { ascending: false }); // Secondary sort: newest first when same date
    
    // Only filter by is_finalized if the column exists (graceful degradation)
    // We'll filter in the application layer if the column doesn't exist

    // Fuzzy search on workout name and date
    if (params.search && params.search.trim()) {
      const searchTerm = params.search.trim();
      // Check if search looks like a date (MM/DD or MM/DD/YY format)
      if (searchTerm.match(/^\d{1,2}\/\d{1,2}/)) {
        // For date search, we'll filter in application layer
        // because performed_at is a date column and we need to format it
      } else {
        // Use ILIKE for case-insensitive partial matching on name
        query = query.ilike('name', `%${searchTerm}%`);
      }
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
      // If error is about is_finalized column not existing, try without it
      if (error.code === '42703' && error.message?.includes('is_finalized')) {
        // Retry without is_finalized filter
        let retryQuery = supabase
          .from('workouts')
          .select('id, name, mode, performed_at, created_at')
          .eq('user_id', user.id)
          .order('performed_at', { ascending: false })
          .order('created_at', { ascending: false }); // Secondary sort: newest first when same date

        if (params.search && params.search.trim()) {
          const searchTerm = params.search.trim();
          if (!searchTerm.match(/^\d{1,2}\/\d{1,2}/)) {
            retryQuery = retryQuery.ilike('name', `%${searchTerm}%`);
          }
        }

        if (params.limit) {
          retryQuery = retryQuery.limit(params.limit);
        }

        const { data: retryData, error: retryError } = await retryQuery;
        if (retryError) {
          return { data: null, error: retryError };
        }
        // Filter by search if it's a date search
        let filtered = retryData || [];
        if (params.search && params.search.trim()) {
          const searchTerm = params.search.trim().toLowerCase();
          if (searchTerm.match(/^\d{1,2}\/\d{1,2}/)) {
            filtered = filtered.filter((w: any) => {
              const dateStr = fmtDateFromISO(w.performed_at).toLowerCase();
              return dateStr === searchTerm || dateStr.startsWith(searchTerm + '/');
            });
          }
        }
        // Return all workouts (since is_finalized column doesn't exist, show all)
        return { data: filtered as HistoryWorkout[], error: null };
      }
      return { data: null, error };
    }

    // Filter by is_finalized in application layer if column exists
    let filteredData = (data || []).filter((w: any) => {
      // If is_finalized column exists and is false, filter it out
      // If column doesn't exist (undefined), include it
      return w.is_finalized !== false;
    });

    // Filter by date search if needed
    if (params.search && params.search.trim()) {
      const searchTerm = params.search.trim().toLowerCase();
      if (searchTerm.match(/^\d{1,2}\/\d{1,2}/)) {
        filteredData = filteredData.filter((w: any) => {
          const dateStr = fmtDateFromISO(w.performed_at).toLowerCase();
          return dateStr === searchTerm || dateStr.startsWith(searchTerm + '/');
        });
      }
    }

    return { data: filteredData as HistoryWorkout[], error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * List workouts for a specific profile (for viewing creator workouts)
 */
export async function listWorkoutsForProfile(params: {
  profileId: string;
  limit?: number;
}): Promise<{ data: HistoryWorkout[] | null; error: any }> {
  try {
    const limit = params.limit || 50;

    console.log(`📋 [Creator Workouts] ===== START Fetching workouts for profile: ${params.profileId} =====`);
    
    // Get current user for debugging
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    console.log(`📋 [Creator Workouts] Current user: ${currentUser?.id || 'not authenticated'}`);
    console.log(`📋 [Creator Workouts] Viewing workouts for profile: ${params.profileId}`);
    console.log(`📋 [Creator Workouts] Is viewing own workouts: ${currentUser?.id === params.profileId}`);

    // Query workouts for the profile
    // Try with is_finalized first, fallback if column doesn't exist
    console.log(`📋 [Creator Workouts] Querying workouts table where user_id = ${params.profileId}`);
    let query = supabase
      .from('workouts')
      .select('id, name, mode, performed_at, is_finalized, user_id, created_at')
      .eq('user_id', params.profileId)
      .order('created_at', { ascending: false }) // Primary sort by created_at (newest first)
      .order('performed_at', { ascending: false }) // Secondary sort by performed_at
      .limit(limit);

    const { data, error } = await query;
    
    console.log(`📋 [Creator Workouts] Query executed. Error:`, error);
    console.log(`📋 [Creator Workouts] Data returned: ${data?.length || 0} workouts`);
    if (data && data.length > 0) {
      console.log(`📋 [Creator Workouts] Workout details:`, data.map(w => ({
        id: w.id,
        name: w.name,
        mode: w.mode,
        user_id: w.user_id,
        is_finalized: w.is_finalized
      })));
    } else if (!error) {
      // No error but no data - let's check if there are ANY workouts for this user
      console.log(`📋 [Creator Workouts] No workouts found. Checking if user has any workouts at all...`);
      const { data: allWorkouts, error: checkError } = await supabase
        .from('workouts')
        .select('id, user_id, name')
        .eq('user_id', params.profileId)
        .limit(10);
      console.log(`📋 [Creator Workouts] Direct query (no filters) returned: ${allWorkouts?.length || 0} workouts`);
      if (allWorkouts && allWorkouts.length > 0) {
        console.log(`📋 [Creator Workouts] Found workouts but they may be filtered out:`, allWorkouts.map(w => ({
          id: w.id,
          name: w.name,
          user_id: w.user_id
        })));
      }
    }

    if (error) {
      console.error('❌ [Creator Workouts] Query error:', error);
      console.error('❌ [Creator Workouts] Error code:', error.code);
      console.error('❌ [Creator Workouts] Error message:', error.message);
      console.error('❌ [Creator Workouts] Error details:', error);
      
      // If error is about is_finalized column, retry without it
      if (error.code === '42703' && error.message?.includes('is_finalized')) {
        console.log('⚠️ [Creator Workouts] is_finalized column not found, retrying without it');
        const { data: retryData, error: retryError } = await supabase
          .from('workouts')
          .select('id, name, mode, performed_at')
          .eq('user_id', params.profileId)
          .order('performed_at', { ascending: false })
          .limit(limit);

        if (retryError) {
          console.error('❌ [Creator Workouts] Retry error:', retryError);
          return { data: null, error: retryError };
        }

        console.log(`✅ [Creator Workouts] Found ${retryData?.length || 0} workouts (all considered finalized)`);
        // Filter finalized workouts in app layer (all workouts are considered finalized if column doesn't exist)
        return { data: (retryData || []) as HistoryWorkout[], error: null };
      }
      
      // If error is about RLS (permission denied), log it clearly
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.error('❌ [Creator Workouts] RLS POLICY ERROR - User may not have permission to view this creator\'s workouts');
        console.error('❌ [Creator Workouts] This suggests the RLS policy needs to allow viewing creator workouts');
      }
      
      return { data: null, error };
    }

    // Filter by is_finalized in app layer
    const filteredData = (data || []).filter((w: any) => {
      // Include if is_finalized is true or undefined (column doesn't exist)
      return w.is_finalized !== false;
    }) as HistoryWorkout[];

    console.log(`✅ [Creator Workouts] Found ${filteredData.length} finalized workouts (filtered from ${data?.length || 0} total)`);
    console.log(`📋 [Creator Workouts] Workout IDs:`, filteredData.map(w => ({ id: w.id, name: w.name, mode: w.mode })));

    return { data: filteredData, error: null };
  } catch (error: any) {
    console.error('❌ [Creator Workouts] Exception:', error);
    return { data: null, error };
  }
}

/**
 * Get workout detail (read-only)
 */
export async function getWorkoutDetail(workoutId: string): Promise<{ data: WorkoutDetails | null; error: any }> {
  // Reuse the existing getWorkoutWithDetails function
  return getWorkoutWithDetails(workoutId);
}

/**
 * List practices
 */
export async function listPractices(params: {
  limit?: number;
}): Promise<{ data: HistoryPractice[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    let query = supabase
      .from('practices')
      .select('id, mode, practiced_at, drill, notes, created_at')
      .eq('user_id', user.id)
      .order('practiced_at', { ascending: false })
      .order('created_at', { ascending: false }); // Secondary sort: newest first when same date

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    return { data: data as HistoryPractice[], error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get practice detail
 */
export async function getPracticeDetail(practiceId: string): Promise<{ data: HistoryPractice | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('practices')
      .select('id, mode, practiced_at, drill, notes')
      .eq('id', practiceId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as HistoryPractice, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * List games
 */
export async function listGames(params: {
  limit?: number;
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
      .order('created_at', { ascending: false }); // Secondary sort: newest first when same date

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    // Convert stats from jsonb to string format for each game
    const gamesWithTextStats = (data || []).map((game: any) => {
      let statsText: string | null = null;
      if (game.stats) {
        if (typeof game.stats === 'object') {
          if ('text' in game.stats) {
            statsText = String(game.stats.text);
          } else {
            statsText = JSON.stringify(game.stats);
          }
        } else {
          statsText = String(game.stats);
        }
      }
      return {
        ...game,
        stats: statsText,
      };
    });

    return { data: gamesWithTextStats as HistoryGame[], error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get game detail
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
      .eq('user_id', user.id)
      .single();

    if (error) {
      return { data: null, error };
    }

    // Convert stats from jsonb to string format
    let statsText: string | null = null;
    if (data.stats) {
      if (typeof data.stats === 'object') {
        // If it's an object like { text: "..." }, extract the text
        if ('text' in data.stats) {
          statsText = String(data.stats.text);
        } else {
          // Otherwise stringify the whole object
          statsText = JSON.stringify(data.stats);
        }
      } else {
        statsText = String(data.stats);
      }
    }

    return {
      data: {
        ...data,
        stats: statsText,
      } as HistoryGame,
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get history stats (total count and streak)
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

    const total = Math.min(count || 0, 999); // Cap at 999

    // Calculate streak
    // For workouts, we need to select is_finalized too (if column exists)
    // For games, we also need result and created_at for proper streak calculation
    let selectColumns = dateColumn;
    if (params.kind === 'workouts') {
      // Try to select is_finalized, but handle gracefully if column doesn't exist
      selectColumns = `${dateColumn}, is_finalized`;
    } else if (params.kind === 'games') {
      // Need result and created_at for consecutive wins calculation
      selectColumns = `${dateColumn}, result, created_at`;
    }
    
    let streakQuery = supabase
      .from(tableName)
      .select(selectColumns)
      .eq('user_id', user.id)
      .order(dateColumn, { ascending: false })
      .order('created_at', { ascending: false }); // Secondary sort for games on same day

    // Apply additional filters (skip is_finalized for workouts - handle in app layer)
    Object.entries(additionalFilter).forEach(([key, value]) => {
      if (key !== 'is_finalized') {
        streakQuery = streakQuery.eq(key, value);
      }
    });

    // Note: For games, we don't filter by result here - we'll handle it in the streak calculation
    // to properly count consecutive wins regardless of date

    const { data: dates, error: datesError } = await streakQuery;

    if (datesError) {
      return { data: null, error: datesError };
    }

    // For workouts, filter by is_finalized in application layer
    let filteredDates = dates || [];
    if (params.kind === 'workouts') {
      filteredDates = filteredDates.filter((d: any) => {
        // If is_finalized column exists and is false, filter it out
        // If column doesn't exist (undefined), include it
        return d.is_finalized !== false;
      });
    }

    // Calculate streak
    let streak = 0;
    if (filteredDates && filteredDates.length > 0) {
      const oneDay = 24 * 60 * 60 * 1000;
      // Use local date, not UTC
      const today = new Date();
      const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      localToday.setHours(0, 0, 0, 0);

      if (params.kind === 'games') {
        // For games: consecutive wins (not consecutive days)
        // Count consecutive wins from most recent backward, regardless of date
        // If user wins 2 games on the same day, that's a 2-game win streak
        // The data is already ordered by played_at desc, then created_at desc (most recent first)
        // filteredDates contains all games with result, created_at
        let consecutiveWins = 0;
        for (const game of filteredDates) {
          if (game.result === 'win') {
            consecutiveWins++;
          } else {
            // Found a loss or tie - streak is broken
            break;
          }
        }
        streak = consecutiveWins;
      } else {
        // For workouts and practices: consecutive days with at least one entry
        const datesByDay = new Set<string>();
        filteredDates.forEach((d: any) => {
          // Parse date as local date (YYYY-MM-DD string)
          const dateStr = d[dateColumn];
          if (dateStr) {
            // dateStr is already in YYYY-MM-DD format from database
            datesByDay.add(dateStr);
          }
        });

        // Count consecutive days from today backward
        let currentDate = new Date(localToday);
        while (true) {
          const dayStr = currentDate.toISOString().split('T')[0];
          if (datesByDay.has(dayStr)) {
            streak++;
            currentDate = new Date(currentDate.getTime() - oneDay);
          } else {
            break;
          }
        }
      }
    }

    streak = Math.min(streak, 999); // Cap at 999

    return { data: { total, streak }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

