// constants/preset-cosmetics.ts
//
// Single source of truth for the cosmetic options a user picks when building a
// preset: icon (from MaterialCommunityIcons or Ionicons) and accent color.
// Used by Build Preset, Workouts (preset chip + exercise card header), and
// History (workout-card date kicker).

export type PresetIconSet = "mci" | "ion";

export interface PresetIconChoice {
  set: PresetIconSet;
  name: string;
  /** Label shown under the icon in the picker (and read by accessibility). */
  label: string;
}

/** Eight icons covering the common sports + general training patterns.
 *  Keep small — Hick's Law: every extra option slows the choice. */
export const PRESET_ICON_CHOICES: PresetIconChoice[] = [
  { set: "mci", name: "dumbbell", label: "Weights" },
  { set: "ion", name: "basketball", label: "Basketball" },
  { set: "ion", name: "american-football", label: "Football" },
  { set: "ion", name: "football", label: "Soccer" },
  { set: "ion", name: "tennisball", label: "Tennis" },
  { set: "ion", name: "baseball", label: "Baseball" },
  { set: "ion", name: "fitness", label: "Fitness" },
  { set: "ion", name: "flame", label: "Intense" },
];

export type PresetColorKey =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

export interface PresetColorTokens {
  /** Saturated solid color — text, accents, full intensity. */
  solid: string;
  /** Mid-opacity wash for header gradient strips, card kickers. */
  wash: string;
  /** Low-opacity tint for backgrounds + borders. */
  subtle: string;
  /** Border color for outlined elements. */
  border: string;
}

/** Color tokens per preset color key. All chosen to read well over the dark
 *  bg0 theme background (sufficient contrast for text on top, distinct hues
 *  for the date kicker pill in History). */
export const PRESET_COLOR_TOKENS: Record<PresetColorKey, PresetColorTokens> = {
  red: {
    solid: "#FF5A5A",
    wash: "rgba(255, 90, 90, 0.30)",
    subtle: "rgba(255, 90, 90, 0.14)",
    border: "rgba(255, 90, 90, 0.40)",
  },
  orange: {
    solid: "#FF9F45",
    wash: "rgba(255, 159, 69, 0.30)",
    subtle: "rgba(255, 159, 69, 0.14)",
    border: "rgba(255, 159, 69, 0.40)",
  },
  yellow: {
    solid: "#F9C846",
    wash: "rgba(249, 200, 70, 0.30)",
    subtle: "rgba(249, 200, 70, 0.14)",
    border: "rgba(249, 200, 70, 0.40)",
  },
  green: {
    solid: "#22C55E",
    wash: "rgba(34, 197, 94, 0.30)",
    subtle: "rgba(34, 197, 94, 0.14)",
    border: "rgba(34, 197, 94, 0.40)",
  },
  blue: {
    solid: "#5AA6FF",
    wash: "rgba(90, 166, 255, 0.30)",
    subtle: "rgba(90, 166, 255, 0.14)",
    border: "rgba(90, 166, 255, 0.40)",
  },
  purple: {
    solid: "#A78BFA",
    wash: "rgba(167, 139, 250, 0.30)",
    subtle: "rgba(167, 139, 250, 0.14)",
    border: "rgba(167, 139, 250, 0.40)",
  },
  pink: {
    solid: "#FF7AB6",
    wash: "rgba(255, 122, 182, 0.30)",
    subtle: "rgba(255, 122, 182, 0.14)",
    border: "rgba(255, 122, 182, 0.40)",
  },
};

/** Ordered list of color keys for the picker UI. */
export const PRESET_COLOR_ORDER: PresetColorKey[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
];

/** Default fallback color for presets without an explicit choice (old rows,
 *  failed lookups). Matches the historical accent green identity. */
export const DEFAULT_PRESET_COLOR: PresetColorKey = "green";

/** Convert a color key (possibly null/unknown) into the token bundle.
 *  Always returns a valid tokens object — callers don't need to null-check. */
export function getPresetColorTokens(
  key: string | null | undefined,
): PresetColorTokens {
  if (key && key in PRESET_COLOR_TOKENS) {
    return PRESET_COLOR_TOKENS[key as PresetColorKey];
  }
  return PRESET_COLOR_TOKENS[DEFAULT_PRESET_COLOR];
}

/** Build a 3-stop gradient (wash → subtle → transparent) suitable for the
 *  Workouts exercise card header strip. */
export function getPresetHeaderGradient(
  key: string | null | undefined,
): string[] {
  const t = getPresetColorTokens(key);
  return [t.wash, t.subtle, "transparent"];
}
