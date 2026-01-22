// lib/api/schedule.ts
// API functions for weekly schedule management

import { supabase } from '../supabase';
import { SportMode, mapModeKeyToSportMode } from '../types';

export interface ScheduleItem {
  dayIndex: number; // 0-6 (0 = Sunday, 6 = Saturday)
  label: string | null;
}

export interface ScheduleWithStatus extends ScheduleItem {
  status: 'completed' | 'missed' | 'rest' | 'empty';
  date: string; // ISO date string
}

/**
 * Get weekly schedule for a specific week
 */
export async function getWeeklySchedule(params: {
  mode: SportMode | string;
  weekStartDate: string; // ISO date string (should be Sunday or Monday)
}): Promise<{ data: ScheduleItem[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const sportMode = typeof params.mode === 'string' 
      ? mapModeKeyToSportMode(params.mode) 
      : params.mode;

    const { data, error } = await supabase
      .from('weekly_schedules')
      .select('day_index, label')
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .eq('week_start_date', params.weekStartDate)
      .order('day_index');

    if (error) {
      return { data: null, error };
    }

    // Fill in missing days with null labels
    const scheduleMap = new Map((data || []).map(item => [item.day_index, item.label]));
    const fullSchedule: ScheduleItem[] = [];
    
    for (let i = 0; i < 7; i++) {
      fullSchedule.push({
        dayIndex: i,
        label: scheduleMap.get(i) || null,
      });
    }

    return { data: fullSchedule, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Upsert weekly schedule (insert or update)
 */
export async function upsertWeeklySchedule(params: {
  mode: SportMode | string;
  weekStartDate: string;
  items: ScheduleItem[];
}): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    const sportMode = typeof params.mode === 'string' 
      ? mapModeKeyToSportMode(params.mode) 
      : params.mode;

    // Delete existing schedule for this week
    await supabase
      .from('weekly_schedules')
      .delete()
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .eq('week_start_date', params.weekStartDate);

    // Insert new schedule items (only those with labels)
    const itemsToInsert = params.items
      .filter(item => item.label && item.label.trim() !== '')
      .map(item => ({
        user_id: user.id,
        mode: sportMode,
        week_start_date: params.weekStartDate,
        day_index: item.dayIndex,
        label: item.label?.trim() || null,
      }));

    if (itemsToInsert.length > 0) {
      const { error } = await supabase
        .from('weekly_schedules')
        .insert(itemsToInsert);

      if (error) {
        return { error };
      }
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Get schedule with completion status (green/red check logic)
 */
export async function getScheduleWithStatus(params: {
  mode: SportMode | string;
  weekStartDate: string;
}): Promise<{ data: ScheduleWithStatus[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const sportMode = typeof params.mode === 'string' 
      ? mapModeKeyToSportMode(params.mode) 
      : params.mode;


    // Get schedule
    const { data: schedule, error: scheduleError } = await getWeeklySchedule(params);
    if (scheduleError) {
      return { data: null, error: scheduleError };
    }

    // Calculate week dates - use local date format to match how workouts are stored
    const weekStart = new Date(params.weekStartDate + 'T00:00:00'); // Parse as local midnight
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      // Format as local date (YYYY-MM-DD) to match workout performed_at format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      weekDates.push(`${year}-${month}-${day}`);
    }

    // Get workouts for this week - MODE AWARE: only get workouts for this specific mode
    // This ensures that a workout logged in lifting mode doesn't mark a basketball schedule as completed
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('performed_at, mode') // Also select mode for debugging/verification
      .eq('user_id', user.id)
      .eq('mode', sportMode) // CRITICAL: Filter by mode so each sport mode only checks its own workouts
      .in('performed_at', weekDates);

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
    }

    // Double-check: filter out any workouts that don't match the mode (defensive programming)
    // This is critical - we must ONLY count workouts from the current mode
    const filteredWorkouts = (workouts || []).filter(w => {
      const matches = w.mode === sportMode;
      if (!matches && w.mode) {
        // Log if we find workouts from other modes (shouldn't happen due to query filter, but defensive)
        console.warn(`Found workout with wrong mode: expected ${sportMode}, got ${w.mode}`);
      }
      return matches;
    });
    
    const workoutDates = new Set(filteredWorkouts.map(w => w.performed_at));
    

    // Build schedule with status
    const scheduleWithStatus: ScheduleWithStatus[] = (schedule || []).map((item, index) => {
      const date = weekDates[index];
      const hasWorkout = workoutDates.has(date);
      const label = item.label?.toLowerCase().trim() || '';
      
      // Check if it's a rest day (EXTREMELY fuzzy match per documentation)
      // Handle variations like "Rest", "Rest Day", "rest day", "day off", "off day", etc.
      const normalizedLabel = label.replace(/[^a-z0-9 ]/g, ''); // Remove punctuation
      const isRest = !label || 
        normalizedLabel === '' ||
        normalizedLabel.startsWith('rest') ||
        normalizedLabel.endsWith('rest') ||
        normalizedLabel.includes(' rest ') ||
        normalizedLabel === 'rest day' ||
        normalizedLabel === 'restday' ||
        normalizedLabel.startsWith('day off') ||
        normalizedLabel.endsWith('off day');

      let status: 'completed' | 'missed' | 'rest' | 'empty';
      
      // Parse date string as local date to avoid timezone issues
      const [year, month, day] = date.split('-').map(Number);
      const dayDate = new Date(year, month - 1, day);
      dayDate.setHours(0, 0, 0, 0);
      
      // Get today's date as local date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isPast = dayDate < today;
      const isToday = dayDate.getTime() === today.getTime();
      
      if (isRest) {
        // Rest days are always completed (green check)
        status = 'rest';
      } else if (!label || label.trim() === '') {
        // No label = empty (gray box)
        status = 'empty';
      } else if (hasWorkout) {
        // Has label and has workout = completed (green check)
        // CRITICAL: hasWorkout should ONLY be true if there's a workout in THIS specific mode
        status = 'completed';
      } else if (isPast && !isToday) {
        // Past day with label but no workout = missed (red X)
        status = 'missed';
      } else {
        // Future day or today with label but no workout yet = empty (gray box)
        status = 'empty';
      }

      return {
        ...item,
        status,
        date,
      };
    });

    return { data: scheduleWithStatus, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get current week start date (Sunday)
 * Uses local date to avoid timezone issues
 */
export function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 6 = Saturday
  const diff = today.getDate() - day; // Days to subtract to get to Sunday
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - day);
  
  // Format as local date (YYYY-MM-DD) to avoid timezone shifts
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(sunday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

/**
 * Get next week start date
 * Uses local date to avoid timezone issues
 */
export function getNextWeekStart(): string {
  const currentWeekStart = getCurrentWeekStart();
  const [year, month, day] = currentWeekStart.split('-').map(Number);
  const nextWeek = new Date(year, month - 1, day);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  // Format as local date (YYYY-MM-DD) to avoid timezone shifts
  const nextYear = nextWeek.getFullYear();
  const nextMonth = String(nextWeek.getMonth() + 1).padStart(2, '0');
  const nextDay = String(nextWeek.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

