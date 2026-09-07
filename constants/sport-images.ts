// constants/sport-images.ts
//
// The single place in the app where sport choice still affects behavior.
// All other sport-mode logic was removed (per CLAUDE.md), but the Log Game /
// Log Practice buttons on Home show a sport-personalized athlete photo and
// the same photo continues into the add-game / add-practice screen via a
// shared-element-style animation.
//
// Notes:
//   - React Native's bundler requires static `require()` calls so all assets
//     are listed here as a map. The string keys (e.g. "kyrie") are what gets
//     passed through `router.push({ params: { imageSource: "kyrie" } })`.
//   - Sport "lifting" has no athlete buttons — Home suppresses them entirely.
//   - If `primary_sport` is null/unknown (legacy users, missing onboarding),
//     `getSportButtons` returns null and Home suppresses the buttons just
//     like for lifting.

import type { ImageSourcePropType } from "react-native";

export type SportKey =
  | "basketball"
  | "football"
  | "soccer"
  | "hockey"
  | "baseball"
  | "tennis"
  | "lifting";

export type ImageKey =
  | "kyrie"
  | "shai"
  | "allen"
  | "jefferson"
  | "yamal"
  | "mbappe"
  | "mcdavid"
  | "matthews"
  | "judge"
  | "ohtani"
  | "carlos"
  | "novak";

// Static require map — bundler resolves these at build time.
export const SPORT_IMAGE_BY_KEY: Record<ImageKey, ImageSourcePropType> = {
  kyrie: require("../assets/players/kyrie.png"),
  shai: require("../assets/players/shai.webp"),
  allen: require("../assets/players/allen.webp"),
  jefferson: require("../assets/players/jefferson.jpg"),
  yamal: require("../assets/players/yamal.jpg"),
  mbappe: require("../assets/players/mbappe.webp"),
  mcdavid: require("../assets/players/mcdavid.jpg"),
  matthews: require("../assets/players/matthews.jpg"),
  judge: require("../assets/players/judge.webp"),
  ohtani: require("../assets/players/ohtani.jpg"),
  carlos: require("../assets/players/carlos.webp"),
  novak: require("../assets/players/novak.webp"),
};

interface SportButtons {
  game: { key: ImageKey };
  practice: { key: ImageKey };
}

// Sport → button image keys. Lifting intentionally omitted (buttons hidden).
const SPORT_BUTTONS: Partial<Record<SportKey, SportButtons>> = {
  basketball: { game: { key: "kyrie" }, practice: { key: "shai" } },
  football: { game: { key: "allen" }, practice: { key: "jefferson" } },
  soccer: { game: { key: "yamal" }, practice: { key: "mbappe" } },
  hockey: { game: { key: "mcdavid" }, practice: { key: "matthews" } },
  baseball: { game: { key: "judge" }, practice: { key: "ohtani" } },
  tennis: { game: { key: "carlos" }, practice: { key: "novak" } },
};

/**
 * Returns the two button image keys for a sport, or null if the sport has no
 * athlete buttons (lifting, or unknown/missing sport).
 * Callers should hide the buttons when this returns null.
 */
export function getSportButtons(sport: string | null | undefined): SportButtons | null {
  if (!sport) return null;
  const normalized = sport.toLowerCase().trim() as SportKey;
  return SPORT_BUTTONS[normalized] ?? null;
}

/** Resolve an image-key string (from route params) back to a real require()'d asset. */
export function getImageByKey(key: string | null | undefined): ImageSourcePropType | null {
  if (!key) return null;
  return SPORT_IMAGE_BY_KEY[key as ImageKey] ?? null;
}
