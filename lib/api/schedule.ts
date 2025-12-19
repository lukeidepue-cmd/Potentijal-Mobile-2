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

    // Calculate week dates
    const weekStart = new Date(params.weekStartDate);
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }

    // Get workouts for this week
    const { data: workouts } = await supabase
      .from('workouts')
      .select('performed_at')
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .in('performed_at', weekDates);

    const workoutDates = new Set((workouts || []).map(w => w.performed_at));

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
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayDate = new Date(date);
      dayDate.setHours(0, 0, 0, 0);
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
 */
export function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 6 = Saturday
  const diff = today.getDate() - day; // Days to subtract to get to Sunday
  const sunday = new Date(today.setDate(diff));
  return sunday.toISOString().split('T')[0];
}

/**
 * Get next week start date
 */
export function getNextWeekStart(): string {
  const currentWeekStart = getCurrentWeekStart();
  const nextWeek = new Date(currentWeekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek.toISOString().split('T')[0];
}

