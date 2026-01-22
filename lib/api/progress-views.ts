/**
 * Progress Views Configuration
 * Defines available views for each sport mode and their calculation methods
 */

import { SportMode, ExerciseType } from '../types';

/**
 * Calculation types for different views
 */
export type ViewCalculationType =
  | 'performance'           // Highest single set (reps × weight)
  | 'tonnage'               // Average (reps × weight × sets) per exercise square
  | 'shooting_percentage'   // Average percentage per set (basketball shooting)
  | 'jumpshot'              // Average attempted per shooting square (basketball shooting)
  | 'drill'                 // Total reps logged (basketball, soccer, hockey, tennis drill)
  | 'completion'             // Average completion % per set (football drill)
  | 'speed'                  // Highest single set (distance / avg_time_sec) (football sprints)
  | 'sprints'                // Total reps logged (football sprints)
  | 'hits'                   // Total reps logged (baseball hitting)
  | 'distance'               // Average avg_distance per set (baseball hitting)
  | 'fielding'               // Average (reps × distance) / sets (baseball fielding)
  | 'shots'                  // Total reps logged (soccer/hockey shooting)
  | 'shot_distance'           // Average distance per set (soccer/hockey shooting)
  | 'rally';                 // Average points per set (tennis rally)

/**
 * Progress View configuration
 */
export interface ProgressView {
  name: string;
  exerciseTypeRestriction: ExerciseType;
  calculationType: ViewCalculationType;
  mode: SportMode;
  description?: string;
}

/**
 * View configurations for each mode
 */
const VIEW_CONFIGURATIONS: Record<SportMode, ProgressView[]> = {
  // Lifting Mode (workout)
  workout: [
    {
      name: 'Performance',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'performance',
      mode: 'workout',
      description: 'Highest single set (reps × weight)',
    },
    {
      name: 'Tonnage',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'tonnage',
      mode: 'workout',
      description: 'Average (reps × weight × sets) per exercise square',
    },
  ],

  // Basketball Mode
  basketball: [
    {
      name: 'Performance',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'performance',
      mode: 'basketball',
      description: 'Highest single set (reps × weight)',
    },
    {
      name: 'Tonnage',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'tonnage',
      mode: 'basketball',
      description: 'Average (reps × weight × sets) per exercise square',
    },
    {
      name: 'Shooting %',
      exerciseTypeRestriction: 'shooting',
      calculationType: 'shooting_percentage',
      mode: 'basketball',
      description: 'Average percentage per set (basketball specific)',
    },
    {
      name: 'Jumpshot',
      exerciseTypeRestriction: 'shooting',
      calculationType: 'jumpshot',
      mode: 'basketball',
      description: 'Average attempted per shooting square (basketball specific)',
    },
    {
      name: 'Drill',
      exerciseTypeRestriction: 'drill',
      calculationType: 'drill',
      mode: 'basketball',
      description: 'Total reps logged for all drill squares',
    },
  ],

  // Football Mode
  football: [
    {
      name: 'Performance',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'performance',
      mode: 'football',
      description: 'Highest single set (reps × weight)',
    },
    {
      name: 'Tonnage',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'tonnage',
      mode: 'football',
      description: 'Average (reps × weight × sets) per exercise square',
    },
    {
      name: 'Completion',
      exerciseTypeRestriction: 'drill',
      calculationType: 'completion',
      mode: 'football',
      description: 'Average completion % per set (football drill specific)',
    },
    {
      name: 'Speed',
      exerciseTypeRestriction: 'sprints',
      calculationType: 'speed',
      mode: 'football',
      description: 'Highest single set (distance / avg_time_sec)',
    },
    {
      name: 'Sprints',
      exerciseTypeRestriction: 'sprints',
      calculationType: 'sprints',
      mode: 'football',
      description: 'Total reps logged for all sprint squares',
    },
  ],

  // Baseball Mode
  baseball: [
    {
      name: 'Performance',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'performance',
      mode: 'baseball',
      description: 'Highest single set (reps × weight)',
    },
    {
      name: 'Tonnage',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'tonnage',
      mode: 'baseball',
      description: 'Average (reps × weight × sets) per exercise square',
    },
    {
      name: 'Hits',
      exerciseTypeRestriction: 'hitting',
      calculationType: 'hits',
      mode: 'baseball',
      description: 'Total reps logged for all hitting squares',
    },
    {
      name: 'Distance',
      exerciseTypeRestriction: 'hitting',
      calculationType: 'distance',
      mode: 'baseball',
      description: 'Average avg_distance per set',
    },
    {
      name: 'Fielding',
      exerciseTypeRestriction: 'fielding',
      calculationType: 'fielding',
      mode: 'baseball',
      description: 'Average (reps × distance) / sets',
    },
  ],

  // Soccer Mode
  soccer: [
    {
      name: 'Performance',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'performance',
      mode: 'soccer',
      description: 'Highest single set (reps × weight)',
    },
    {
      name: 'Tonnage',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'tonnage',
      mode: 'soccer',
      description: 'Average (reps × weight × sets) per exercise square',
    },
    {
      name: 'Drill',
      exerciseTypeRestriction: 'drill',
      calculationType: 'drill',
      mode: 'soccer',
      description: 'Total reps logged for all drill squares',
    },
    {
      name: 'Shots',
      exerciseTypeRestriction: 'shooting',
      calculationType: 'shots',
      mode: 'soccer',
      description: 'Total reps logged for all shooting squares (soccer/hockey specific)',
    },
    {
      name: 'Shot Distance',
      exerciseTypeRestriction: 'shooting',
      calculationType: 'shot_distance',
      mode: 'soccer',
      description: 'Average distance per set (soccer/hockey specific)',
    },
  ],

  // Hockey Mode
  hockey: [
    {
      name: 'Performance',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'performance',
      mode: 'hockey',
      description: 'Highest single set (reps × weight)',
    },
    {
      name: 'Tonnage',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'tonnage',
      mode: 'hockey',
      description: 'Average (reps × weight × sets) per exercise square',
    },
    {
      name: 'Drill',
      exerciseTypeRestriction: 'drill',
      calculationType: 'drill',
      mode: 'hockey',
      description: 'Total reps logged for all drill squares',
    },
    {
      name: 'Shots',
      exerciseTypeRestriction: 'shooting',
      calculationType: 'shots',
      mode: 'hockey',
      description: 'Total reps logged for all shooting squares (soccer/hockey specific)',
    },
    {
      name: 'Shot Distance',
      exerciseTypeRestriction: 'shooting',
      calculationType: 'shot_distance',
      mode: 'hockey',
      description: 'Average distance per set (soccer/hockey specific)',
    },
  ],

  // Tennis Mode
  tennis: [
    {
      name: 'Performance',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'performance',
      mode: 'tennis',
      description: 'Highest single set (reps × weight)',
    },
    {
      name: 'Tonnage',
      exerciseTypeRestriction: 'exercise',
      calculationType: 'tonnage',
      mode: 'tennis',
      description: 'Average (reps × weight × sets) per exercise square',
    },
    {
      name: 'Drill',
      exerciseTypeRestriction: 'drill',
      calculationType: 'drill',
      mode: 'tennis',
      description: 'Total reps logged for all drill squares',
    },
    {
      name: 'Rally',
      exerciseTypeRestriction: 'rally',
      calculationType: 'rally',
      mode: 'tennis',
      description: 'Average points per set',
    },
  ],

  // Running Mode (not used in progress graphs, but included for completeness)
  running: [],
};

/**
 * Get available views for a specific sport mode
 */
export function getAvailableViewsForMode(mode: SportMode): ProgressView[] {
  return VIEW_CONFIGURATIONS[mode] || [];
}

/**
 * Get view configuration by mode and view name
 */
export function getViewConfig(mode: SportMode, viewName: string): ProgressView | null {
  const views = getAvailableViewsForMode(mode);
  return views.find(v => v.name === viewName) || null;
}

/**
 * Check if a view can display an exercise based on exercise type
 */
export function canViewDisplayExercise(
  mode: SportMode,
  viewName: string,
  exerciseType: ExerciseType
): boolean {
  const viewConfig = getViewConfig(mode, viewName);
  if (!viewConfig) return false;
  
  return viewConfig.exerciseTypeRestriction === exerciseType;
}

/**
 * Get all view names for a mode (for UI dropdowns)
 */
export function getViewNamesForMode(mode: SportMode): string[] {
  return getAvailableViewsForMode(mode).map(v => v.name);
}

/**
 * Get calculation type for a view
 */
export function getCalculationTypeForView(mode: SportMode, viewName: string): ViewCalculationType | null {
  const viewConfig = getViewConfig(mode, viewName);
  return viewConfig?.calculationType || null;
}

/**
 * Get exercise type restriction for a view
 */
export function getExerciseTypeRestrictionForView(mode: SportMode, viewName: string): ExerciseType | null {
  const viewConfig = getViewConfig(mode, viewName);
  return viewConfig?.exerciseTypeRestriction || null;
}
