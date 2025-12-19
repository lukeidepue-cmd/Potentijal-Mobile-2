// lib/api/goals.ts
// API functions for weekly goals management

import { supabase } from '../supabase';
import { SportMode, mapModeKeyToSportMode } from '../types';

export interface WeeklyGoal {
  id: string;
  name: string;
  targetValue: number;
  currentValue?: number; // Computed from progress
}

/**
 * Create a weekly goal
 */
export async function createWeeklyGoal(params: {
  mode: SportMode | string;
  name: string;
  targetValue: number;
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
      .from('weekly_goals')
      .insert({
        user_id: user.id,
        mode: sportMode,
        name: params.name.trim(),
        target_value: params.targetValue,
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
 * List weekly goals for a mode
 */
export async function listWeeklyGoals(params: {
  mode: SportMode | string;
}): Promise<{ data: WeeklyGoal[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const sportMode = typeof params.mode === 'string' 
      ? mapModeKeyToSportMode(params.mode) 
      : params.mode;

    const { data, error } = await supabase
      .from('weekly_goals')
      .select('id, name, target_value')
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    const goals: WeeklyGoal[] = (data || []).map(item => ({
      id: item.id,
      name: item.name,
      targetValue: item.target_value,
    }));

    return { data: goals, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get weekly goal progress (calls RPC function)
 */
export async function getWeeklyGoalProgress(goalId: string): Promise<{
  data: { currentValue: number; targetValue: number; goalName: string } | null;
  error: any;
}> {
  try {
    const { data, error } = await supabase.rpc('get_weekly_goal_progress', {
      p_goal_id: goalId,
    });

    if (error) {
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return {
        data: { currentValue: 0, targetValue: 0, goalName: '' },
        error: null,
      };
    }

    return {
      data: {
        currentValue: data[0].current_value || 0,
        targetValue: data[0].target_value || 0,
        goalName: data[0].goal_name || '',
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Delete a weekly goal
 */
export async function deleteWeeklyGoal(goalId: string): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    const { error } = await supabase
      .from('weekly_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id);

    return { error };
  } catch (error: any) {
    return { error };
  }
}


