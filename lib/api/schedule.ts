// lib/api/schedule.ts
// API functions for the (now single, sport-agnostic) weekly schedule.

import { supabase } from '../supabase';

export interface ScheduleItem {
  dayIndex: number; // 0-6 (0 = Sunday, 6 = Saturday)
  label: string | null;
}

export interface ScheduleWithStatus extends ScheduleItem {
  status: 'completed' | 'missed' | 'rest' | 'empty';
  date: string; // ISO date string
}

// DB schema still has a NOT NULL `mode` column on weekly_schedules.
// We write everything under this single value so there is exactly one schedule per week.
const SCHEDULE_MODE = 'workout';

/**
 * Get weekly schedule for a specific week.
 * Mode-agnostic on read: collapses any historical per-mode rows into one row per day,
 * preferring the entry written under SCHEDULE_MODE when both exist.
 */
export async function getWeeklySchedule(params: {
  weekStartDate: string;
}): Promise<{ data: ScheduleItem[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('weekly_schedules')
      .select('day_index, label, mode')
      .eq('user_id', user.id)
      .eq('week_start_date', params.weekStartDate)
      .order('day_index');

    if (error) {
      return { data: null, error };
    }

    // Collapse: prefer SCHEDULE_MODE row; otherwise take whatever exists.
    const byDay = new Map<number, { label: string | null; isPreferred: boolean }>();
    for (const row of data || []) {
      const existing = byDay.get(row.day_index);
      const isPreferred = row.mode === SCHEDULE_MODE;
      if (!existing || (isPreferred && !existing.isPreferred)) {
        byDay.set(row.day_index, { label: row.label, isPreferred });
      }
    }

    const fullSchedule: ScheduleItem[] = [];
    for (let i = 0; i < 7; i++) {
      fullSchedule.push({ dayIndex: i, label: byDay.get(i)?.label ?? null });
    }
    return { data: fullSchedule, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Replace the schedule for a week. Deletes all rows for the week (across legacy
 * modes) and reinserts under SCHEDULE_MODE so there is one source of truth.
 */
export async function upsertWeeklySchedule(params: {
  weekStartDate: string;
  items: ScheduleItem[];
}): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    await supabase
      .from('weekly_schedules')
      .delete()
      .eq('user_id', user.id)
      .eq('week_start_date', params.weekStartDate);

    const itemsToInsert = params.items
      .filter(item => item.label && item.label.trim() !== '')
      .map(item => ({
        user_id: user.id,
        mode: SCHEDULE_MODE,
        week_start_date: params.weekStartDate,
        day_index: item.dayIndex,
        label: item.label?.trim() || null,
      }));

    if (itemsToInsert.length > 0) {
      const { error } = await supabase.from('weekly_schedules').insert(itemsToInsert);
      if (error) return { error };
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Get schedule with completion status. A workout in *any* mode on a scheduled day
 * now counts as completion (sport modes no longer matter).
 */
export async function getScheduleWithStatus(params: {
  weekStartDate: string;
}): Promise<{ data: ScheduleWithStatus[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data: schedule, error: scheduleError } = await getWeeklySchedule(params);
    if (scheduleError) {
      return { data: null, error: scheduleError };
    }

    // Build the 7 dates of the week as local YYYY-MM-DD strings.
    const weekStart = new Date(params.weekStartDate + 'T00:00:00');
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      weekDates.push(`${year}-${month}-${day}`);
    }

    const { data: workouts } = await supabase
      .from('workouts')
      .select('performed_at')
      .eq('user_id', user.id)
      .in('performed_at', weekDates);

    const workoutDates = new Set((workouts || []).map(w => w.performed_at));

    const scheduleWithStatus: ScheduleWithStatus[] = (schedule || []).map((item, index) => {
      const date = weekDates[index];
      const hasWorkout = workoutDates.has(date);
      const label = item.label?.toLowerCase().trim() || '';
      const normalizedLabel = label.replace(/[^a-z0-9 ]/g, '');
      const isRest = !label ||
        normalizedLabel === '' ||
        normalizedLabel.startsWith('rest') ||
        normalizedLabel.endsWith('rest') ||
        normalizedLabel.includes(' rest ') ||
        normalizedLabel === 'rest day' ||
        normalizedLabel === 'restday' ||
        normalizedLabel.startsWith('day off') ||
        normalizedLabel.endsWith('off day');

      const [year, month, day] = date.split('-').map(Number);
      const dayDate = new Date(year, month - 1, day);
      dayDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPast = dayDate < today;
      const isToday = dayDate.getTime() === today.getTime();

      let status: 'completed' | 'missed' | 'rest' | 'empty';
      if (isRest) status = 'rest';
      else if (!label || label.trim() === '') status = 'empty';
      else if (hasWorkout) status = 'completed';
      else if (isPast && !isToday) status = 'missed';
      else status = 'empty';

      return { ...item, status, date };
    });

    return { data: scheduleWithStatus, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/** Current week start (Sunday) as local YYYY-MM-DD. */
export function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - day);
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(sunday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

/** Next week start as local YYYY-MM-DD. */
export function getNextWeekStart(): string {
  const currentWeekStart = getCurrentWeekStart();
  const [year, month, day] = currentWeekStart.split('-').map(Number);
  const nextWeek = new Date(year, month - 1, day);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextYear = nextWeek.getFullYear();
  const nextMonth = String(nextWeek.getMonth() + 1).padStart(2, '0');
  const nextDay = String(nextWeek.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}
