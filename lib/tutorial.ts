// lib/tutorial.ts
//
// Lightweight, AsyncStorage-backed step pointer for the post-onboarding in-app
// tutorial. The tutorial is a forced, ordered sequence shown exactly once —
// armed the moment onboarding completes (app/onboarding/name-entry.tsx) and
// never re-armed on later logins or app launches.
//
// Steps:
//   build_preset  — Home is dimmed; user must tap "Build New Preset".
//   preset_intro  — New Preset screen dimmed; tap anywhere to continue.
//   preset_stats  — New Preset screen dimmed except the highlighted Stats boxes;
//                   tapping a stat box clears the dim.
//   preset_build  — No dim, but the user can't leave the screen until they
//                   actually create a preset.
//   done          — Tutorial finished / not active.

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key. The `:v2` suffix is a deliberate version bump: earlier builds
// re-armed the tutorial on every launch, leaving an in-progress step persisted
// under the old `@tutorial:step` key on existing devices. Bumping the key makes
// that stale value invisible — those devices now read 'done' (no tutorial),
// while genuinely-new users still get armed at onboarding under the new key.
const KEY = '@tutorial:step:v2';

/** A window-space rectangle used to cut spotlight holes in tutorial overlays. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The ordered tutorial steps. 'done' means the tutorial is finished/dismissed. */
export type TutorialStep =
  | 'build_preset'
  | 'preset_intro'
  | 'preset_stats'
  | 'preset_build'
  | 'home_workout_tab'
  | 'workouts_preset'
  | 'workouts_exercise_box'
  | 'workouts_progress_tab'
  | 'progress_graph_button'
  | 'progress_graph_intro'
  | 'progress_build_view_button'
  | 'view_intro'
  | 'view_build'
  | 'done';

const VALID_STEPS: TutorialStep[] = [
  'build_preset',
  'preset_intro',
  'preset_stats',
  'preset_build',
  'home_workout_tab',
  'workouts_preset',
  'workouts_exercise_box',
  'workouts_progress_tab',
  'progress_graph_button',
  'progress_graph_intro',
  'progress_build_view_button',
  'view_intro',
  'view_build',
  'done',
];

/** First step new users see. Bump this when reordering the tutorial. */
export const FIRST_TUTORIAL_STEP: TutorialStep = 'build_preset';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  TESTING ONLY — SET BACK TO `false` BEFORE SHIPPING  ⚠️
//
// When true, the tutorial re-arms at FIRST_TUTORIAL_STEP on every app launch,
// so it can be replayed without creating a new account. The real once-only
// behaviour below is untouched — this just short-circuits the storage read.
//
// Shipping with this true means EVERY user replays the tutorial on EVERY launch.
// ─────────────────────────────────────────────────────────────────────────────
export const TUTORIAL_REPLAY_FOR_TESTING = false;

/** Read the current tutorial step. Returns 'done' when nothing valid is stored. */
export async function getTutorialStep(): Promise<TutorialStep> {
  // See TUTORIAL_REPLAY_FOR_TESTING above — dev override, not shipping behaviour.
  if (TUTORIAL_REPLAY_FOR_TESTING) return FIRST_TUTORIAL_STEP;

  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v && (VALID_STEPS as string[]).includes(v) && v !== 'done') {
      return v as TutorialStep;
    }
    return 'done';
  } catch {
    return 'done';
  }
}

/** Persist a specific tutorial step. Pass 'done' to finish it. */
export async function setTutorialStep(step: TutorialStep): Promise<void> {
  try {
    if (step === 'done') {
      await AsyncStorage.removeItem(KEY);
    } else {
      await AsyncStorage.setItem(KEY, step);
    }
  } catch {
    // Non-fatal — a missing tutorial flag just means the user skips the tutorial.
  }
}
