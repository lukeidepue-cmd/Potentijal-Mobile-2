// lib/api/workouts.ts
// API functions for workout management

import { supabase } from '../supabase';
import { useAuth } from '../../providers/AuthProvider';
import { SportMode, ExerciseType, mapItemKindToExerciseType, mapModeKeyToSportMode } from '../types';

export interface CreateWorkoutParams {
  mode: SportMode | string; // Accept string for frontend mode keys
  name: string;
  performedAt?: string; // ISO date string
}

export interface AddExerciseParams {
  workoutId: string;
  exerciseType: ExerciseType | string; // Accept string for frontend item kinds
  name: string;
}

export interface SetData {
  setIndex: number;
  reps?: number;
  weight?: number;
  attempted?: number;
  made?: number;
  distance?: number;
  timeMin?: number;
  avgTimeSec?: number;
  completed?: boolean;
  points?: number;
}

export interface UpsertSetsParams {
  exerciseId: string;
  sets: SetData[];
}

export interface WorkoutDetails {
  id: string;
  name: string;
  mode: SportMode;
  performedAt: string;
  exercises: Array<{
    id: string;
    name: string;
    type: ExerciseType;
    sets: Array<{
      id: string;
      setIndex: number;
      reps?: number;
      weight?: number;
      attempted?: number;
      made?: number;
      distance?: number;
      timeMin?: number;
      avgTimeSec?: number;
      completed?: boolean;
      points?: number;
    }>;
  }>;
}

/**
 * Create a new workout
 */
export async function createWorkout(params: CreateWorkoutParams): Promise<{ data: string | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Map frontend mode to database mode if needed
    const sportMode = typeof params.mode === 'string' 
      ? mapModeKeyToSportMode(params.mode) 
      : params.mode;

    // Format date using local date to avoid timezone issues
    let performedAtDate: string;
    if (params.performedAt) {
      performedAtDate = params.performedAt;
    } else {
      // Use local date, not UTC
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      performedAtDate = `${year}-${month}-${day}`;
    }

    // Insert workout - try with is_finalized first, fallback if column doesn't exist
    let insertData: any = {
      user_id: user.id,
      mode: sportMode,
      name: params.name.trim(),
      performed_at: performedAtDate,
    };
    
    // Only add is_finalized if the column exists (after migration 009)
    // For now, we'll insert without it and handle finalization differently
    const { data, error } = await supabase
      .from('workouts')
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
 * Add an exercise to a workout
 */
export async function addExercise(params: AddExerciseParams): Promise<{ data: string | null; error: any }> {
  try {
    // Map frontend exercise type to database type if needed
    const exerciseType = typeof params.exerciseType === 'string'
      ? mapItemKindToExerciseType(params.exerciseType)
      : params.exerciseType;

    const { data, error } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: params.workoutId,
        exercise_type: exerciseType,
        name: params.name.trim(),
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
 * Upsert sets for an exercise
 */
export async function upsertSets(params: UpsertSetsParams): Promise<{ error: any }> {
  try {
    // Delete existing sets for this exercise
    await supabase
      .from('workout_sets')
      .delete()
      .eq('workout_exercise_id', params.exerciseId);

    // Insert new sets
    const setsToInsert = params.sets
      .filter(set => {
        // Only insert sets that have at least one non-empty value
        return set.reps !== undefined || 
               set.weight !== undefined || 
               set.attempted !== undefined || 
               set.made !== undefined ||
               set.distance !== undefined ||
               set.timeMin !== undefined ||
               set.avgTimeSec !== undefined ||
               set.completed !== undefined ||
               set.points !== undefined;
      })
      .map(set => ({
        workout_exercise_id: params.exerciseId,
        set_index: set.setIndex,
        reps: set.reps ? parseFloat(String(set.reps)) : null,
        weight: set.weight ? parseFloat(String(set.weight)) : null,
        attempted: set.attempted ? parseFloat(String(set.attempted)) : null,
        made: set.made ? parseFloat(String(set.made)) : null,
        distance: set.distance ? parseFloat(String(set.distance)) : null,
        time_min: set.timeMin ? parseFloat(String(set.timeMin)) : null,
        avg_time_sec: set.avgTimeSec ? parseFloat(String(set.avgTimeSec)) : null,
        completed: set.completed ?? null,
        points: set.points ? parseFloat(String(set.points)) : null,
      }));

    if (setsToInsert.length === 0) {
      return { error: null };
    }

    const { error } = await supabase
      .from('workout_sets')
      .insert(setsToInsert);

    return { error };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Finalize a workout (currently just ensures everything is saved)
 */
export async function finalizeWorkout(workoutId: string): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    // Try to update is_finalized, but handle case where column doesn't exist yet
    // If column doesn't exist, the workout is already "finalized" since it was saved
    const updateData: any = {};
    
    // Check if we can update is_finalized (column exists after migration 009)
    // For now, we'll try to update it, but if it fails, that's okay - the workout is already saved
    try {
      const { error: updateError } = await supabase
        .from('workouts')
        .update({ is_finalized: true })
        .eq('id', workoutId)
        .eq('user_id', user.id); // Security: ensure user owns this workout

      // If error is about column not existing, that's okay - workout is already saved
      if (updateError && !updateError.message?.includes('is_finalized')) {
        return { error: updateError };
      }
    } catch (err: any) {
      // Column doesn't exist yet - that's fine, workout is already in database
      // The migration will add the column later
      if (!err.message?.includes('is_finalized')) {
        return { error: err };
      }
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Get a workout with all its exercises and sets
 */
export async function getWorkoutWithDetails(workoutId: string): Promise<{ data: WorkoutDetails | null; error: any }> {
  try {
    console.log(`💪 [Workout Details] ===== START Fetching workout details: ${workoutId} =====`);
    
    // Get current user for debugging
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    console.log(`💪 [Workout Details] Current user: ${currentUser?.id || 'not authenticated'}`);
    
    // Fetch workout
    console.log(`💪 [Workout Details] Querying workouts table for workout: ${workoutId}`);
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select('id, name, mode, performed_at, user_id')
      .eq('id', workoutId)
      .single();

    if (workoutError || !workout) {
      console.error(`❌ [Workout Details] Workout query error:`, workoutError);
      console.error(`❌ [Workout Details] Workout data:`, workout);
      return { data: null, error: workoutError || { message: 'Workout not found' } };
    }

    console.log(`✅ [Workout Details] Workout found:`, { id: workout.id, name: workout.name, user_id: workout.user_id });
    console.log(`💪 [Workout Details] Is viewing own workout: ${currentUser?.id === workout.user_id}`);

    // Fetch exercises
    console.log(`💪 [Workout Details] Querying workout_exercises for workout: ${workoutId}`);
    const { data: exercises, error: exercisesError } = await supabase
      .from('workout_exercises')
      .select('id, name, exercise_type')
      .eq('workout_id', workoutId)
      .order('created_at');

    if (exercisesError) {
      console.error(`❌ [Workout Details] Exercises query error:`, exercisesError);
      console.error(`❌ [Workout Details] Error code:`, exercisesError.code);
      console.error(`❌ [Workout Details] Error message:`, exercisesError.message);
      return { data: null, error: exercisesError };
    }

    console.log(`✅ [Workout Details] Found ${exercises?.length || 0} exercises`);

    // Fetch sets for each exercise
    console.log(`💪 [Workout Details] Fetching sets for ${exercises?.length || 0} exercises`);
    const exercisesWithSets = await Promise.all(
      (exercises || []).map(async (exercise) => {
        const { data: sets, error: setsError } = await supabase
          .from('workout_sets')
          .select('id, set_index, reps, weight, attempted, made, distance, time_min, avg_time_sec, completed, points')
          .eq('workout_exercise_id', exercise.id)
          .order('set_index');

        if (setsError) {
          console.error(`❌ [Workout Details] Sets query error for exercise ${exercise.id}:`, setsError);
        } else {
          console.log(`✅ [Workout Details] Found ${sets?.length || 0} sets for exercise ${exercise.id} (${exercise.name})`);
        }

        return {
          id: exercise.id,
          name: exercise.name || '',
          type: (exercise.exercise_type || 'exercise') as ExerciseType,
          sets: (sets || []).map(set => ({
            id: set.id,
            setIndex: set.set_index,
            reps: set.reps ?? undefined,
            weight: set.weight ?? undefined,
            attempted: set.attempted ?? undefined,
            made: set.made ?? undefined,
            distance: set.distance ?? undefined,
            timeMin: set.time_min ?? undefined,
            avgTimeSec: set.avg_time_sec ?? undefined,
            completed: set.completed ?? undefined,
            points: set.points ?? undefined,
          })),
        };
      })
    );

    const result = {
      data: {
        id: workout.id,
        name: workout.name || '',
        mode: workout.mode as SportMode,
        performedAt: workout.performed_at || new Date().toISOString(),
        exercises: exercisesWithSets,
      },
      error: null,
    };

    console.log(`✅ [Workout Details] ===== END Successfully loaded workout with ${exercisesWithSets.length} exercises =====`);
    return result;
  } catch (error: any) {
    console.error(`❌ [Workout Details] Exception:`, error);
    return { data: null, error };
  }
}

/**
 * Save a complete workout (creates workout, exercises, and sets in one transaction-like flow)
 */
export async function saveCompleteWorkout(params: {
  mode: SportMode | string;
  name: string;
  performedAt?: string;
  items: Array<{
    kind: string;
    name: string;
    sets: Array<Record<string, string>>;
  }>;
}): Promise<{ data: string | null; error: any }> {
  try {
    // 1. Create workout
    const { data: workoutId, error: workoutError } = await createWorkout({
      mode: params.mode,
      name: params.name,
      performedAt: params.performedAt,
    });

    if (workoutError || !workoutId) {
      return { data: null, error: workoutError || { message: 'Failed to create workout' } };
    }

    // 2. Create exercises and sets
    for (const item of params.items) {
      if (!item.name.trim()) continue; // Skip exercises without names

      // Add exercise
      const { data: exerciseId, error: exerciseError } = await addExercise({
        workoutId,
        exerciseType: item.kind,
        name: item.name,
      });

      if (exerciseError || !exerciseId) {
        console.error('Failed to add exercise:', exerciseError);
        continue; // Skip this exercise but continue with others
      }

      // Add sets
      const sets: SetData[] = item.sets
        .map((set, index) => {
          const setData: SetData = { setIndex: index + 1 };
          
          // Parse all possible fields
          if (set.reps) setData.reps = parseFloat(set.reps);
          if (set.weight) setData.weight = parseFloat(set.weight);
          if (set.attempted) setData.attempted = parseFloat(set.attempted);
          if (set.made) setData.made = parseFloat(set.made);
          // Handle both "distance" and "avgDistance" (hitting exercises use avgDistance in UI)
          // Prioritize avgDistance if it exists, otherwise use distance
          if (set.avgDistance) {
            setData.distance = parseFloat(set.avgDistance);
          } else if (set.distance) {
            setData.distance = parseFloat(set.distance);
          }
          if (set.time) setData.timeMin = parseFloat(set.time);
          if (set.avgTime) setData.avgTimeSec = parseFloat(set.avgTime);
          if (set.completed !== undefined) setData.completed = set.completed === 'true' || set.completed === true;
          if (set.points) setData.points = parseFloat(set.points);

          return setData;
        })
        .filter(set => {
          // Only include sets with at least one value
          return Object.values(set).some((v, i) => i > 0 && v !== undefined && v !== null);
        });

      if (sets.length > 0) {
        await upsertSets({ exerciseId, sets });
      }
    }

    return { data: workoutId, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Copy a workout skeleton (exercises only, no sets) from another user's workout
 * Used for copying creator workouts
 */
export async function copyWorkoutSkeleton(params: {
  sourceWorkoutId: string;
}): Promise<{ data: string | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get the source workout
    const sourceWorkout = await getWorkoutWithDetails(params.sourceWorkoutId);
    if (sourceWorkout.error || !sourceWorkout.data) {
      return { data: null, error: sourceWorkout.error || { message: 'Workout not found' } };
    }

    const workout = sourceWorkout.data;

    // Create new workout with "(Copied)" suffix
    const newWorkoutName = `${workout.name} (Copied)`;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const performedAtDate = `${year}-${month}-${day}`;

    const { data: newWorkout, error: createError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        mode: workout.mode,
        name: newWorkoutName,
        performed_at: performedAtDate,
        is_finalized: false, // Start as draft
      })
      .select('id')
      .single();

    if (createError || !newWorkout) {
      return { data: null, error: createError || { message: 'Failed to create workout' } };
    }

    // Copy exercises (without sets)
    for (const exercise of workout.exercises) {
      const { error: exerciseError } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: newWorkout.id,
          exercise_type: exercise.type,
          name: exercise.name,
        });

      if (exerciseError) {
        console.error('Error copying exercise:', exerciseError);
        // Continue with other exercises
      }
    }

    return { data: newWorkout.id, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}


