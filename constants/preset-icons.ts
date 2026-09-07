// constants/preset-icons.ts
// Curated icon set users can pick from when building an exercise preset.
// Used by the Build Preset screen (picker) and the Workouts tab (button render).

import type { IconSet } from "../lib/api/presets";

export interface PresetIcon {
  set: IconSet;
  name: string;
}

/**
 * The list shown in the icon picker, in display order. Grouped loosely by
 * theme (lifting → cardio → sports → measurement/generic) so the grid reads
 * naturally top-to-bottom.
 */
export const PRESET_ICON_CHOICES: PresetIcon[] = [
  // Lifting / strength
  { set: "mci", name: "dumbbell" },
  { set: "mci", name: "weight-lifter" },
  { set: "mci", name: "weight" },
  { set: "mci", name: "arm-flex" },

  // Cardio / movement
  { set: "mci", name: "run-fast" },
  { set: "mci", name: "run" },
  { set: "mci", name: "bike" },
  { set: "mci", name: "jump-rope" },

  // Sports
  { set: "ion", name: "basketball-outline" },
  { set: "ion", name: "football-outline" },
  { set: "ion", name: "american-football-outline" },
  { set: "mci", name: "baseball" },
  { set: "mci", name: "hockey-sticks" },
  { set: "mci", name: "tennis" },
  { set: "mci", name: "golf" },
  { set: "mci", name: "volleyball" },

  // Measurement / generic
  { set: "mci", name: "target" },
  { set: "ion", name: "time-outline" },
  { set: "ion", name: "stopwatch-outline" },
  { set: "ion", name: "heart-outline" },
  { set: "mci", name: "fire" },
  { set: "mci", name: "chart-line" },
  { set: "ion", name: "star-outline" },
  { set: "ion", name: "trophy-outline" },
];

/** Fallback for presets that were created before the icon picker existed. */
export const DEFAULT_PRESET_ICON: PresetIcon = { set: "mci", name: "dumbbell" };
