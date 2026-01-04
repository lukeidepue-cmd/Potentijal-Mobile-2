// lib/api/goals-direct.ts
// Direct query version for weekly goals progress - bypasses RPC

import { supabase } from '../supabase';
import { SportMode, mapModeKeyToSportMode } from '../types';

/**
 * Get weekly goal progress using direct queries (bypasses RPC)
 * Implements the same fuzzy matching logic as the RPC but in TypeScript
 */
export async function getWeeklyGoalProgressDirect(goalId: string): Promise<{
  data: { currentValue: number; targetValue: number; goalName: string } | null;
  error: any;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get goal details
    const { data: goal, error: goalError } = await supabase
      .from('weekly_goals')
      .select('user_id, mode, name, target_value')
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      return { data: null, error: goalError || { message: 'Goal not found' } };
    }

    const goalName = goal.name || '';
    const targetValue = goal.target_value || 0;
    const sportMode = goal.mode as SportMode;

    // Calculate current week start (Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Format as local dates (YYYY-MM-DD) to avoid timezone shifts
    const weekStartYear = weekStart.getFullYear();
    const weekStartMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
    const weekStartDay = String(weekStart.getDate()).padStart(2, '0');
    const weekStartStr = `${weekStartYear}-${weekStartMonth}-${weekStartDay}`;
    
    const weekEndYear = weekEnd.getFullYear();
    const weekEndMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
    const weekEndDay = String(weekEnd.getDate()).padStart(2, '0');
    const weekEndStr = `${weekEndYear}-${weekEndMonth}-${weekEndDay}`;

    // Check if this is a "Workouts" goal
    const goalNameLower = goalName.toLowerCase().trim();
    if (goalNameLower.includes('workout') && !goalNameLower.includes('exercise')) {
      // Count distinct workouts
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id')
        .eq('user_id', user.id)
        .eq('mode', sportMode)
        .gte('performed_at', weekStartStr)
        .lt('performed_at', weekEndStr);

      if (workoutsError) {
        return { data: null, error: workoutsError };
      }

      return {
        data: {
          currentValue: workouts?.length || 0,
          targetValue,
          goalName,
        },
        error: null,
      };
    }

    // For exercise-based goals, get all exercises and sets
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('id, performed_at')
      .eq('user_id', user.id)
      .eq('mode', sportMode)
      .gte('performed_at', weekStartStr)
      .lt('performed_at', weekEndStr);

    if (workoutsError) {
      return { data: null, error: workoutsError };
    }

    if (!workouts || workouts.length === 0) {
      return {
        data: { currentValue: 0, targetValue, goalName },
        error: null,
      };
    }

    const workoutIds = workouts.map(w => w.id);

    // Get exercises for these workouts
    const { data: exercises, error: exercisesError } = await supabase
      .from('workout_exercises')
      .select('id, name, workout_id')
      .in('workout_id', workoutIds);

    if (exercisesError) {
      return { data: null, error: exercisesError };
    }

    // Fuzzy match exercises to goal name
    const matchingExerciseIds: string[] = [];

    exercises?.forEach((exercise: any) => {
      const exerciseNameLower = (exercise.name || '').toLowerCase();
      const exerciseNameNoSpaces = exerciseNameLower.replace(/\s+/g, '');
      const goalNameNoSpaces = goalNameLower.replace(/\s+/g, '');

      // EXTREMELY lenient fuzzy matching
      const exerciseWords = exerciseNameLower.split(/\s+/).filter(w => w.length > 2);
      const goalWords = goalNameLower.split(/\s+/).filter(w => w.length > 2);

      let matches = false;

      // Exact or substring match
      if (exerciseNameLower.includes(goalNameLower) ||
          goalNameLower.includes(exerciseNameLower) ||
          exerciseNameNoSpaces.includes(goalNameNoSpaces) ||
          goalNameNoSpaces.includes(exerciseNameNoSpaces)) {
        matches = true;
      }

      // Word-based matching
      if (!matches && goalWords.length > 0) {
        matches = goalWords.some(gw =>
          exerciseWords.some(ew => ew.includes(gw) || gw.includes(ew))
        );
      }

      // Starts with match
      if (!matches && (
        exerciseNameLower.startsWith(goalNameLower) ||
        goalNameLower.startsWith(exerciseNameLower) ||
        exerciseWords.some(ew => ew.startsWith(goalNameLower)) ||
        goalWords.some(gw => exerciseWords.some(ew => ew.startsWith(gw)))
      )) {
        matches = true;
      }

      if (matches) {
        matchingExerciseIds.push(exercise.id);
      }
    });

    if (matchingExerciseIds.length === 0) {
      return {
        data: { currentValue: 0, targetValue, goalName },
        error: null,
      };
    }

    // Get sets for matching exercises
    const { data: sets, error: setsError } = await supabase
      .from('workout_sets')
      .select('reps, attempted, made')
      .in('workout_exercise_id', matchingExerciseIds);

    if (setsError) {
      return { data: null, error: setsError };
    }

    // Calculate total based on goal name
    let total = 0;
    sets?.forEach((set: any) => {
      if (goalNameLower.includes('made')) {
        total += Number(set.made || 0);
      } else if (goalNameLower.includes('attempted')) {
        total += Number(set.attempted || 0);
      } else {
        total += Number(set.reps || 0);
      }
    });

    return {
      data: {
        currentValue: total,
        targetValue,
        goalName,
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

