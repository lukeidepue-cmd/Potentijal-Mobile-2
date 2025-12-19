// lib/types.ts
// Type definitions matching Supabase schema

export type SportMode =
  | 'workout'
  | 'basketball'
  | 'football'
  | 'baseball'
  | 'soccer'
  | 'hockey'
  | 'tennis'
  | 'running';

export type ExerciseType =
  | 'exercise'   // reps, weight
  | 'shooting'   // attempted, made
  | 'drill'      // reps, time_min or reps, completed
  | 'sprints'    // reps, distance, avg_time_sec
  | 'hitting'    // reps, avg_distance
  | 'fielding'   // reps, distance
  | 'rally';     // points, time_min

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type GameResult = 'win' | 'loss' | 'tie';

export type AppPlan = 'free' | 'premium' | 'creator';

// Map frontend ItemKind to database ExerciseType
export function mapItemKindToExerciseType(kind: string): ExerciseType {
  const mapping: Record<string, ExerciseType> = {
    exercise: 'exercise',
    bb_shot: 'shooting',
    fb_drill: 'drill',
    fb_sprint: 'sprints',
    sc_drill: 'drill',
    sc_shoot: 'shooting',
    bs_hit: 'hitting',
    bs_field: 'fielding',
    hk_drill: 'drill',
    hk_shoot: 'shooting',
    tn_drill: 'drill',
    tn_rally: 'rally',
  };
  return mapping[kind] || 'exercise';
}

// Map frontend ModeKey to database SportMode
export function mapModeKeyToSportMode(mode: string): SportMode {
  const mapping: Record<string, SportMode> = {
    lifting: 'workout',
    basketball: 'basketball',
    football: 'football',
    baseball: 'baseball',
    soccer: 'soccer',
    hockey: 'hockey',
    tennis: 'tennis',
    running: 'running',
  };
  return mapping[mode.toLowerCase()] || 'workout';
}


