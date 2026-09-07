// constants/theme.ts
//
// Token additions (May 2026) follow the research in docs/DESIGN_RESEARCH_2026.md.
// All NEW tokens live alongside the OLD ones; nothing is renamed or removed,
// so every existing screen still resolves the same values.
//
//   theme.colors.* / theme.color.* / theme.radii / theme.shadow / theme.layout
//   theme.text / theme.gradients / theme.topHighlight    ← unchanged
//
//   theme.semantic.*  ← new: bg/text/border/accent/intent tokens (research §4)
//   theme.space.*     ← new: 8pt-locked T-shirt scale (research §3)
//   theme.radius.*    ← new: full 0→pill scale incl. 20/28
//   theme.type.*      ← new: 1.25 modular scale + weight + tracking
//   theme.spring.*    ← new: Apple-style Reanimated spring presets (research §5)
//   theme.duration.*  ← new: Material 3 duration tokens (research §5)
//   theme.easing.*    ← new: Material 3 cubic-bezier easing tokens
//   theme.elevation.* ← new: 4-level shadow recipe
//
// When redesigning a screen, prefer the new tokens; the old aliases will live
// on until every screen is migrated.

import { Platform } from "react-native";

export const colors = {
  /* Core surfaces & text (legacy) */
  bg0:        "#070B10",
  surface1:   "#0D131B",
  surface2:   "#111A24",
  strokeSoft: "#1A2430",
  textHi:     "#E6F1FF",
  textLo:     "#8AA0B5",

  /* Brand / accent (legacy) */
  primary600: "#17D67F",
  primary500: "#1FEA8D",
  primary700: "#0DBA6D",
  secondary500: "#58C6FF",
  purple:     "#A78BFA",

  /* Fun accents used in UI (legacy) */
  accentBlue:   "#5AA6FF",
  accentTeal:   "#33D1B2",
  accentMint:   "#2BF996",
  accentAmber:  "#F9C846",
  accentRose:   "#FF5A5A",

  /* App-level brand tokens (legacy) */
  brand:     "#12B885",
  brandDim:  "rgba(18,184,133,0.7)",

  /* Status colors (legacy) */
  warning:   "#F9C846",
  danger:    "#FF5A5A",
  success:   "#2BF996",

  /* Glows (legacy) */
  glowPrimary:   "rgba(23, 214, 127, 0.20)",
  glowSecondary: "rgba(88, 198, 255, 0.20)",
} as const;

const color = {
  bg:   colors.bg0,
  text: colors.textHi,
  dim:  colors.textLo,
  brand: colors.primary600,
  brandDim: colors.primary500,
  macro: {
    calories: colors.accentMint,
    protein:  colors.accentRose,
    carbs:    colors.accentBlue,
    fat:      colors.accentAmber,
  },
} as const;

/* ─────────────────────────────────────────────────────────────
 * NEW — Semantic tokens (research §4 — Color)
 * Three-step background, three-step text, two-step border,
 * a single accent (athletic green), and intent colors.
 * Built for dark mode first. Light-mode parallel can be added later.
 * ───────────────────────────────────────────────────────────── */
const semantic = {
  bg: {
    canvas:        "#0A0E12",   // outermost
    surface:       "#11171F",   // cards on canvas
    surfaceElevated:"#171F28",  // cards on cards / sheets
    subtle:        "rgba(255,255,255,0.04)",  // chips / disabled fills
    overlay:       "rgba(0,0,0,0.55)",        // modal scrim
  },
  text: {
    primary:   "rgba(255,255,255,0.94)",  // 94% — avoid pure white
    secondary: "rgba(255,255,255,0.62)",
    tertiary:  "rgba(255,255,255,0.40)",
    muted:     "rgba(255,255,255,0.28)",
    inverse:   "#06090C",                  // text on accent backgrounds
  },
  border: {
    hairline: "rgba(255,255,255,0.06)",   // dividers
    subtle:   "rgba(255,255,255,0.09)",   // card outlines
    default:  "rgba(255,255,255,0.14)",   // visible borders
    strong:   "rgba(255,255,255,0.22)",   // focus rings
  },
  accent: {
    solid:  "#22C55E",       // athletic green (current brand-adjacent)
    hover:  "#1FB257",
    subtle: "rgba(34,197,94,0.14)",
    glow:   "rgba(34,197,94,0.32)",
  },
  intent: {
    success: "#22C55E",
    warning: "#F5C84B",
    danger:  "#FF6B6B",
    info:    "#58C6FF",
  },
} as const;

/* ─────────────────────────────────────────────────────────────
 * NEW — Spacing (research §3 — 8pt grid + T-shirt scale)
 * ───────────────────────────────────────────────────────────── */
const space = {
  px2:   2,
  px4:   4,
  px8:   8,
  px12:  12,
  px16:  16,
  px20:  20,
  px24:  24,
  px32:  32,
  px48:  48,
  px64:  64,
} as const;

/* ─────────────────────────────────────────────────────────────
 * NEW — Radius (full scale, 0 → pill)
 * ───────────────────────────────────────────────────────────── */
const radius = {
  none:  0,
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  xxl:   24,
  xxxl:  28,   // iOS 26 sheet / floating tab capsule
  pill:  999,
} as const;

/* ─────────────────────────────────────────────────────────────
 * NEW — Type system (research §4 — 1.25 modular scale, base 16)
 * Sizes are unitless RN sizes. Weights use the iOS scale strings
 * Reanimated/RN expect. Line-heights are absolute (not multipliers).
 * ───────────────────────────────────────────────────────────── */
const type = {
  size: {
    xs:    11,
    sm:    13,
    base:  15,
    md:    17,   // iOS body default
    lg:    20,
    xl:    24,
    xxl:   30,
    xxxl:  36,
    display: 48,
    hero:    64,
  },
  weight: {
    regular: "400" as const,
    medium:  "500" as const,
    semi:    "600" as const,
    bold:    "700" as const,
    heavy:   "800" as const,
    black:   "900" as const,
  },
  tracking: {
    tight:    -0.5,   // display, large numerics
    snug:     -0.25,
    normal:    0,
    wide:      0.3,
    allcaps:   1.2,   // small uppercase labels
  },
  lineHeight: {
    display: 1.05,    // multiply by size when applying
    heading: 1.15,
    snug:    1.30,
    body:    1.45,
    relaxed: 1.55,
  },
  // Pre-baked text presets — drop into <Text style={theme.type.preset.hero}>
  preset: {
    hero: {
      fontSize: 48,
      lineHeight: 50,
      fontWeight: "700" as const,
      letterSpacing: -1.0,
    },
    display: {
      fontSize: 32,
      lineHeight: 36,
      fontWeight: "700" as const,
      letterSpacing: -0.5,
    },
    titleXL: {
      fontSize: 24,
      lineHeight: 28,
      fontWeight: "700" as const,
      letterSpacing: -0.25,
    },
    titleL: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "600" as const,
    },
    titleM: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "600" as const,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "400" as const,
    },
    bodyStrong: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "600" as const,
    },
    caption: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "500" as const,
    },
    micro: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "600" as const,
      letterSpacing: 0.6,
      textTransform: "uppercase" as const,
    },
  },
} as const;

/* ─────────────────────────────────────────────────────────────
 * NEW — Motion (research §5 — Apple-style springs + M3 easing)
 * ───────────────────────────────────────────────────────────── */
const spring = {
  /** Quick, controlled — button press, segmented switch */
  snappy:      { damping: 26, stiffness: 280, mass: 1 },
  /** No bounce, gentle — sheet, modal, page transition */
  smooth:      { damping: 20, stiffness: 170, mass: 1 },
  /** Playful overshoot — celebration, badge pop */
  bouncy:      { damping: 8,  stiffness: 100, mass: 1 },
  /** Drag-follow — gesture-driven UI */
  interactive: { damping: 25, stiffness: 300, mass: 0.5 },
  /** Sheet detents — Apple's UIKit-ish feel */
  sheet:       { damping: 20, stiffness: 200, mass: 1 },
} as const;

const duration = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  med1:   250,
  med2:   300,
  med3:   350,
  med4:   400,
  long1:  450,
  long2:  500,
  long3:  550,
  long4:  600,
} as const;

const easing = {
  // Material 3 cubic-bezier curves — cross-platform safe.
  standard:              [0.2, 0, 0, 1.0]    as [number, number, number, number],
  standardAccelerate:    [0.3, 0, 1, 1]      as [number, number, number, number],
  standardDecelerate:    [0, 0, 0, 1]        as [number, number, number, number],
  emphasized:            [0.05, 0.7, 0.1, 1] as [number, number, number, number],
  emphasizedAccelerate:  [0.3, 0, 0.8, 0.15] as [number, number, number, number],
  legacy:                [0.4, 0, 0.2, 1]    as [number, number, number, number],
} as const;

/* ─────────────────────────────────────────────────────────────
 * NEW — Elevation (research §4 — 4-level shadow recipe, RN-native)
 * ───────────────────────────────────────────────────────────── */
const elevation = {
  /** Flat on canvas */
  e0: { shadowColor: "transparent", shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  /** Card resting */
  e1: Platform.select({
    ios:     { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6,  shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 2 },
    default: {},
  }) as object,
  /** Card hovered / floating button */
  e2: Platform.select({
    ios:     { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 6 },
    default: {},
  }) as object,
  /** Modal / bottom sheet */
  e3: Platform.select({
    ios:     { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
    android: { elevation: 12 },
    default: {},
  }) as object,
} as const;

/* ─────────────────────────────────────────────────────────────
 * Existing tokens (kept verbatim for backwards compatibility)
 * ───────────────────────────────────────────────────────────── */
const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

const shadow = {
  soft: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  hard: {
    shadowColor: "#000",
    shadowOpacity: 0.40,
    shadowRadius: 18,
    elevation: 10,
  },
} as const;

const layout = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
} as const;

const text = {
  h1: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "900" as const,
  },
  h2: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900" as const,
  },
  title: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "900" as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "800" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  muted: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700" as const,
  },
} as const;

const gradients = {
  brand: ["#17D67F", "#0CCF9E", "#00B5FF"],
  surface: ["rgba(13, 19, 27, 0.8)", "rgba(13, 19, 27, 0.4)"],
  vignetteTop: "rgba(0, 0, 0, 0.3)",
  vignetteCorners: "rgba(0, 0, 0, 0.2)",
} as const;

const topHighlight = {
  gradientFrom: "rgba(255,255,255,0.06)",
  gradientTo: "rgba(255,255,255,0.00)",
} as const;

export const theme = {
  // legacy (preserved)
  colors,
  color,
  radii,
  shadow,
  layout,
  text,
  gradients,
  topHighlight,
  // new (additive)
  semantic,
  space,
  radius,
  type,
  spring,
  duration,
  easing,
  elevation,
} as const;

export default theme;
export type AppTheme = typeof theme;
