---
topic: Design
sub-topic: Mobile UI/UX + psychology
date: 2026-05-28
depth: deep
tags: [design, ux, ui, mobile, psychology, ios, apple, react-native, fitness-app, research-complete, high-conviction, actionable]
sources: 78
confidence: high
related: [[Design]], [[mobile-app-design-psychology-2026-brief]], [[mobile-app-design-psychology-2026-sources]]
type: deep-dive
---

# Mobile App Design + Psychology — Deep Dive

A working reference for redesigning Potentijal. This document is structured for **lookup during design work**, not for cover-to-cover reading. Use the TOC to jump to the section you need.

> **Companion:** [[mobile-app-design-psychology-2026-brief|Brief]] for the executive summary, [[mobile-app-design-psychology-2026-sources|Sources]] for the full citation list.

## Table of contents

1. [Cognitive psychology — the principles that matter](#cognitive-psychology--the-principles-that-matter)
2. [Apple in 2026 — HIG, iOS 26, Liquid Glass](#apple-in-2026--hig-ios-26-liquid-glass)
3. [Material Design 3 / Expressive — what to ignore](#material-design-3--expressive--what-to-ignore)
4. [Concrete design system specs](#concrete-design-system-specs)
   - [Typography](#typography)
   - [Color](#color)
   - [Spacing + layout](#spacing--layout)
   - [Depth, shadows, materials](#depth-shadows-materials)
   - [Motion + micro-interactions + haptics](#motion--micro-interactions--haptics)
5. [Component patterns](#component-patterns)
6. [Data visualization for fitness](#data-visualization-for-fitness)
7. [Dark mode specifics](#dark-mode-specifics)
8. [App teardowns — 18 imitable references](#app-teardowns--18-imitable-references)
9. [Apple-grade polish checklist for RN/Expo](#apple-grade-polish-checklist-for-rnexpo)
10. [Highest-ROI changes for Potentijal](#highest-roi-changes-for-potentijal)
11. [Contradictions + uncertainties](#contradictions--uncertainties)
12. [Open questions + next research threads](#open-questions--next-research-threads)
13. [Historical analogues — flat design, Material You, Liquid Glass](#historical-analogues)

---

## Cognitive psychology — the principles that matter

The umbrella reference is [Laws of UX](https://lawsofux.com/) by Jon Yablonski — 21 cross-disciplinary heuristics. The book covers all of them in detail; the website is a free reference. Most premium apps observe most of these quietly.

### Aesthetic-Usability Effect ⭐ load-bearing
- **Claim:** Users perceive attractive interfaces as more usable — even when actual usability is identical.
- **Evidence:** Kurosu & Kashimura (Hitachi, 1995) — 26 ATM UI variants, 252 participants. Aesthetic ratings correlated more strongly with *perceived* ease of use than with *actual* ease of use. Replicated by Tractinsky in 2000.
- **Implication for Potentijal:** Investing in type, spacing, motion, and color **is** investing in usability. The polish pays off perceptually and behaviorally — users also forgive minor friction in beautiful apps. This is why fixing the four foundations (type / color / spacing / motion) jumps the perceived quality tier.
- **Source:** [Aesthetic-Usability Effect — NN/g](https://www.nngroup.com/articles/aesthetic-usability-effect/), [Laws of UX](https://lawsofux.com/aesthetic-usability-effect/).

### Peak-End Rule (Kahneman)
- **Claim:** People judge an experience by its emotional peak and its end, not its average.
- **Mechanism:** Memory encoding privileges intensity + recency.
- **Implication:** Design a celebratory peak after every workout — haptics + animation + PR/streak callout. Make the "session complete" end state itself satisfying. Apple Fitness's ring-close animation + haptic is the canonical example; Duolingo's gamified end-of-lesson screen is the application archetype.
- **For Potentijal:** the post-workout summary is the single highest-leverage screen for retention. Don't waste it on a generic toast.
- **Source:** [Peak-End Rule — Laws of UX](https://lawsofux.com/peak-end-rule/).

### Goal-Gradient + Endowed Progress ⭐ habit-forming
- **Claim:** Motivation accelerates as users approach a goal; perceived prior progress (even if artificial) increases completion.
- **Evidence:** Kivetz et al. coffee-card study — 12-stamp cards with 2 free stamps completed faster than 10-stamp empty cards, despite identical work remaining. Loss aversion kicks in near completion.
- **Implication:** Show partial fills on streaks/rings from day 1. Pre-check the first onboarding step. Visualize "3 of 4 workouts this week — one to go." Apple Watch Activity rings are the canonical example: proximity to closure visibly intensifies user effort.
- **For Potentijal:** weekly schedule completion display should always show "X of Y done" with partial fill; never a binary "complete/incomplete."
- **Source:** [Apple Watch psychology — Trophy](https://trophy.so/blog/the-psychology-of-apple-watchs-close-your-rings), [Goal Gradient — Learning Loop](https://learningloop.io/plays/psychology/goal-gradient-effect).

### Doherty Threshold (<400ms)
- **Claim:** Productivity + engagement increase when system response is <400ms.
- **Evidence:** Doherty & Thadani (IBM 1982) — sub-400ms responses produced 25–30% more transactions/hour. Also aligns with Nielsen's three response-time thresholds: <100ms feels instant, <1s feels uninterrupted, >10s the user disengages.
- **Implication:**
  - Pre-fetch the next likely screen.
  - **Optimistic UI** — assume success on toggles/check-offs; reconcile on failure.
  - Skeleton screens for any content load >300ms (perceived ~30% faster than spinners; Facebook reported ~300ms perceived improvement).
  - Animate state changes to mask network calls.
- **Source:** [Doherty Threshold — Laws of UX](https://lawsofux.com/doherty-threshold/), [Skeleton screens vs spinners — UI Deploy](https://ui-deploy.com/blog/skeleton-screens-vs-spinners-optimizing-perceived-performance).

### Fitts's Law
- **Claim:** Time to acquire a target is a logarithmic function of distance and size.
- **Implication:**
  - **Bottom-aligned primary CTA** (thumb zone). 44pt minimum tap target on iOS, 48dp on Android, 44 CSS px per WCAG 2.5.5.
  - Destructive actions placed far from the natural thumb arc (avoid putting "Delete" where "Save" usually is).
- **For Potentijal:** "Start Workout" and "+ Add Preset" belong in the thumb-friendly bottom band, large.
- **Source:** [Fitts's Law — Laws of UX](https://lawsofux.com/fittss-law/).

### Hick's Law
- **Claim:** Decision time grows logarithmically with the number of choices.
- **Implication:** Cap visible choices at ~5; progressive disclosure for advanced options. Use a "More" affordance for rarely-used items.
- **For Potentijal:** the workout-type chips should be ≤5 visible; show user's favorite presets first; hide secondary settings behind "More."
- **Source:** [21 Laws of UX — Looppanel](https://www.looppanel.com/blog/laws-of-ux).

### Miller's Law (chunking, 7±2) — read with caution
- **Claim:** Working memory holds ~7±2 chunks. The literal number is **widely misapplied** in UX writing; the *chunking principle* is robust, but "7" is not a hard cap.
- **Implication:** Group related items into chunks (set + reps + weight = one "set card" chunk; week of workouts = one "week" chunk). Don't use "7" to justify arbitrary numeric limits.
- **Source:** [Miller's Law (Userbrain)](https://www.userbrain.com/blog/millers-law-important-rule-ux-design-everyone-breaks/).

### Jakob's Law
- **Claim:** Users spend most of their time on other apps, so they expect yours to work like the ones they already know.
- **Implication:** Use platform-native gestures (swipe-to-delete, pull-to-refresh). Mirror Strava / Apple Fitness / Whoop conventions where neutral. Only break a convention if you're certain the payoff > confusion cost.
- **For Potentijal:** the workouts tab, history tab, and progress dashboards should look + behave like first-class iOS apps in the same category.
- **Source:** [Jakob's Law — Laws of UX](https://lawsofux.com/jakobs-law/).

### Von Restorff (Isolation) Effect
- **Claim:** An item that visually differs from a group is most likely to be remembered + clicked.
- **Implication:** **One** primary CTA per screen, visually distinct from secondaries. Highlight today's workout vs. completed/upcoming.
- **Source:** [Von Restorff — Laws of UX](https://lawsofux.com/von-restorff-effect/).

### Serial Position Effect
- **Claim:** Items at the beginning (primacy) and end (recency) of a list are recalled best; the middle is forgotten.
- **Implication:** Place primary tabs at the leftmost and rightmost positions of the bottom tab bar; bury "Settings"/"More" in the middle.
- **For Potentijal:** Home and History (the two most-used tabs) should sit at the ends of the bar; Workouts and Progress in the middle is fine because users get there from the home screen.
- **Source:** [Serial Position — Think360](https://think360studio.com/blog/serial-position-effect).

### Tesler's Law (Conservation of Complexity)
- **Claim:** Every system has irreducible complexity. The only question is who bears it — engineer or user.
- **Implication:** Pre-fill smart defaults so users don't configure every set. Eat the engineering cost so the user doesn't.
- **For Potentijal:** auto-fill last weight × reps when adding a set; default rest timer; default RPE to a common value; default workout name to "{day name} Workout".
- **Source:** [Tesler's Law — Laws of UX](https://lawsofux.com/teslers-law/).

### Postel's Law (Robustness)
- **Claim:** Be conservative in what you output, liberal in what you accept.
- **Implication:** Accept "225", "225 lb", "225lbs", "102.5 kg" in the same weight field. Smart-parse exercise names. Tolerate typos in search.
- **For Potentijal:** the exercise-name fuzzy matching already exists; extend that liberality to weight/rep/time inputs.
- **Source:** [Postel's Law — Laws of UX](https://lawsofux.com/laws/postels-law/).

### Zeigarnik Effect
- **Claim:** Uncompleted tasks create cognitive tension; they're remembered more vividly than completed ones.
- **Implication:** Progress bars on workout completion, "1 more set to go" prompts, profile-completion %, partially filled streak rings — leverage tension to drive return visits.
- **Source:** [Zeigarnik — GeeksforGeeks](https://www.geeksforgeeks.org/techtips/zeigarnik-effect-in-ux-design/).

### Gestalt Principles
The brain prefers wholes over parts; spacing communicates hierarchy more powerfully than dividers do.

- **Proximity:** Near = related. Use spacing to group set/rep/weight inside one chunk.
- **Similarity:** Same style = same function. Use color/shape consistently for action types.
- **Common Region:** Card containers bundle metadata visually.
- **Continuity:** Eye follows smooth paths; align elements on a grid.
- **Closure:** Brain fills gaps; use partial fills + outlines that imply completion.
- **Figure/Ground:** Strong figure-ground separation (high contrast, isolation) draws attention to the focal point.
- **Source:** [Proximity — NN/g](https://www.nngroup.com/articles/gestalt-proximity/), [Gestalt for UI — Toptal](https://www.toptal.com/designers/ui/gestalt-principles-of-design).

### Cognitive Load Theory
Three load types: **intrinsic** (inherent task complexity), **extraneous** (poor design adds load), **germane** (effort that builds long-term schemas). Design goal: **minimize extraneous** + leverage chunking to keep intrinsic manageable.

- Label icons (NN/g's classic Volvo study: unlabeled icons forced users to guess; labels solved it).
- Avoid jargon.
- Build on existing mental models (Jakob's Law applied).
- **Source:** [Cognitive Load — Laws of UX](https://lawsofux.com/cognitive-load/).

### Color Psychology
~90% of snap product judgments are color-driven. Specific hues prime specific emotions, modulated by culture.

| Color | Western association |
|---|---|
| Blue | Trust, calm, professionalism, tech |
| Green | Health, balance, growth, success |
| Red | Urgency, danger, passion, error (Western) / luck (Chinese) |
| Orange | Energy, athletics, enthusiasm |
| Purple | Premium, creativity, royalty |
| Yellow | Optimism, caution |
| Black | Premium, sophistication |

For Potentijal (athletic + premium): a confident athletic accent — volt green, vivid orange, or saturated electric blue — paired with deep neutrals. Reserve red exclusively for true warnings. Use the 60-30-10 split.

- **Source:** [Psychology of Color in UX — Smashing](https://www.smashingmagazine.com/2025/08/psychology-color-ux-design-digital-products/).

### Hooked Model (Nir Eyal) — used ethically
- **Loop:** Trigger → Action → Variable Reward → Investment.
- **Trigger:** Morning workout reminder tied to context.
- **Action:** One-tap "Start today's session."
- **Variable Reward:** Unpredictable form of recognition — sometimes PR alert, sometimes streak callout, sometimes trend insight, sometimes new milestone. **Vary the form, never the fact.**
- **Investment:** Logged workouts, custom presets, training history — each session deepens lock-in.
- **Ethics:** Eyal's own *Manipulation Matrix* — only build the loop if it materially improves the user's life AND you'd use it yourself. Avoid loot-box variable rewards.
- **Source:** [Hook Model — Amplitude](https://amplitude.com/blog/the-hook-model), [Variable Rewards — Nir & Far](https://www.nirandfar.com/want-to-hook-your-users-drive-them-crazy/).

### BJ Fogg Behavior Model (B = MAP)
- **Claim:** Behavior occurs only when Motivation, Ability, and a Prompt converge.
- **Implication:** If motivation is low, make the behavior easier. Default workouts to a "minimum viable" 10-minute version. Contextual prompts at high-motivation moments. Never prompt when ability is low.
- **Source:** [behaviormodel.org](https://www.behaviormodel.org/).

### Stanford Web Credibility / Trust Cues
- **Claim:** ~46% of users assess credibility from visual design alone; 75% judge company credibility by website/app design (Stanford Persuasive Tech Lab).
- **Implication:** Premium typography, fast launch, real photography, visible privacy/data policies, transparent receipts/refund flow.
- **Source:** [Stanford Web Credibility Project](https://credibility.stanford.edu/).

### Perceived Performance — the 100ms / 1s / 10s thresholds
| Threshold | Feel | Treatment |
|---|---|---|
| <100ms | Instant | No indicator needed |
| 100ms–1s | Uninterrupted | Subtle visual feedback (color change, micro-animation) |
| 1s–10s | Brief wait | Skeleton screen or progress bar |
| >10s | Disengagement | Progress bar + estimated time + cancel |

- Skeleton screens make apps feel ~30% faster than spinners (Facebook).
- Optimistic UI removes wait entirely.
- **Source:** [Skeleton screens — UI Deploy](https://ui-deploy.com/blog/skeleton-screens-vs-spinners-optimizing-perceived-performance).

### F-Pattern + Z-Pattern + Saliency
- F-pattern: text-heavy screens (lists, history).
- Z-pattern: visual screens (dashboards, marketing).
- Top-left wins first fixation in LTR cultures.
- **For Potentijal:** Home dashboard = Z-pattern (brand top-left, hero metric top-right, secondary cards middle, primary CTA bottom). History = F-pattern (date/title left, summary stats right).
- **Source:** [Visual Hierarchy — Sessions College](https://www.sessions.edu/notes-on-design/visual-hierarchy-key-ux-principles-that-drive-results/).

### Ethical guardrails (so we don't build dark patterns)
Harry Brignull (deceptive.design, 2010) catalogued UI patterns that exploit cognitive biases against users. Now regulated under EU DSA + CPRA. **Avoid in Potentijal:**
- Forced continuity trials (charge silently when trial ends)
- Hidden cancel flows
- Manufactured scarcity ("3 left at this price")
- Confirm-shaming ("No thanks, I don't want to get stronger")
- Pre-checked opt-ins for marketing
- **Source:** [Deceptive Patterns — Brignull](https://www.deceptive.design/), [Deceptive Patterns in UX — NN/g](https://www.nngroup.com/articles/deceptive-patterns/).

### Cialdini's Influence Principles (ethical use)
Reciprocity, Commitment/Consistency, Social Proof, Authority, Liking, Scarcity, Unity.
- Social proof: "X athletes lifted today" (real, not fabricated).
- Commitment: ask user to state their goal during onboarding; reflect it back at decision moments.
- Authority: cite coaches/research behind programs.
- Unity: community/team-based challenges.
- Reciprocity: free PR analysis before paywall.
- **Source:** [Cialdini's 7 — Cognitigence](https://www.cognitigence.com/blog/cialdini-7-principles-of-persuasion).

### Don't Make Me Think (Krug) — three timeless laws
1. Every question mark in a UI taxes the user — eliminate the need to think.
2. People scan, don't read. Halve the words on every screen.
3. Conventions are friends; obvious > clever.
- **Source:** [DMMT Key Learning Points — IxDF](https://ixdf.org/literature/article/don-t-make-me-think-key-learning-points-for-ux-design-for-the-web).

### CREATE Action Funnel (Wendel)
Six prerequisites for a target action: **Cue, Reaction, Evaluation, Ability, Timing, Experience.** Drop-off at any step kills the behavior. For every Potentijal goal (log workout, hit streak, upgrade), map the CREATE funnel and find the weakest link — usually Timing (wrong moment) or Evaluation (user can't see benefit fast enough).
- **Source:** [Designing for Behavior Change — O'Reilly](https://www.oreilly.com/library/view/designing-for-behavior/9781449367947/).

---

## Apple in 2026 — HIG, iOS 26, Liquid Glass

### iOS 26 Liquid Glass — the headline change
- **What it is:** Apple's first system-wide visual overhaul since iOS 7. Translucent dynamic material that "reflects and refracts" surroundings, with specular highlights, depth, and motion responsiveness. **Announced WWDC 2025 (June 9), shipped September 2025.** Extends across iOS 26, iPadOS 26, macOS Tahoe 26, watchOS 26, tvOS 26.
- **Material spec:** light-bending optics (refraction layer), specular highlights on edges/icons, content-aware tinting, "lensing" near edges. Material thickness varies by context (regular vs. clear effects).
- **Components that changed most:** tab bars (now floating capsules, shrink on scroll, expand on scroll-up), sidebars, sheets, controls, app icons (multi-layer glass), Dock, widgets.
- **Sources:** [Apple Newsroom](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/), [Meet Liquid Glass — WWDC25 session 219](https://developer.apple.com/videos/play/wwdc2025/219/), [Wikipedia](https://en.wikipedia.org/wiki/Liquid_Glass).

### Liquid Glass reception + criticism (load-bearing context)
- Mixed reception. Apple curated a developer gallery (~12 apps: AllTrails, Carrot Weather, Fantastical, Trello, Kroger) **five months post-launch** — signaling slow adoption.
- **NN/g flagged:** shrunken tab bars; touch targets falling below 0.4cm minimum spacing; translucent controls blending into noisy backgrounds.
- Independent observers counted ~4 distinct border-radius sizes across macOS 26 ("almost random").
- Apple currently exposes an opt-out flag for devs; rumored removal in future Xcode.
- **Apple's own accessibility report card** was downgraded in March 2026 for Liquid Glass legibility issues.
- **Sources:** [MacRumors gallery coverage](https://www.macrumors.com/2025/11/06/apple-liquid-glass-design-gallery/), [Daring Fireball — Engst on Liquid Glass](https://daringfireball.net/linked/2025/10/14/engst-liquid-glass), [9to5Mac accessibility report card downgrade](https://9to5mac.com/2026/03/18/liquid-glass-and-long-standing-bugs-push-apples-grades-down-in-visual-accessibility-report-card/).

### Apple's evolved design principles
- Original iOS 7 trio (**Clarity / Deference / Depth**) is still load-bearing.
- iOS 26 emphasis: **Hierarchy / Harmony / Consistency.** Hierarchy is now "dynamic" — UI prioritizes/hides components based on user action.
- **For Potentijal:** content is the protagonist. Use translucency + motion only when reinforcing hierarchy; never decorative.
- **Source:** [Create with Swift — Liquid Glass principles](https://www.createwithswift.com/liquid-glass-redefining-design-through-hierarchy-harmony-and-consistency/).

### iOS 26 floating tab bars (specific pattern)
- Capsule-shaped, inset from edges, float over content. **Shrink on scroll**, expand on scroll-up. Search broken out as a separate circular pill on the right.
- **For Potentijal RN:** custom tab bar absolute-positioned with `expo-glass-effect` `<GlassView>` background; gate iOS 26 with `Platform.Version >= 26`; fall back to `expo-blur` `<BlurView>` on older iOS.
- **Sources:** [Donny Wals — Tab bars on iOS 26](https://www.donnywals.com/exploring-tab-bars-on-ios-26-with-liquid-glass/), [Ryan Ashcraft — Beef with iOS 26 Tab Bar](https://ryanashcraft.com/ios-26-tab-bar-beef/).

### Sheets + detents
- Detents: `.medium` (~half screen), `.large` (~92%). Custom detents allowed since iOS 16.
- Grabber affordance indicates resizability. Pull-to-dismiss is default.
- **For Potentijal RN:** use `@gorhom/bottom-sheet` or React Navigation native stack with `sheetAllowedDetents: ['medium', 'large']`, `sheetGrabberVisible: true`.
- **Source:** [Apple HIG Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets).

### Materials, blur, vibrancy
Five system materials: `ultraThin / thin / regular / thick / chrome`. Vibrancy re-tints overlaid content (labels, separators) for legibility against the blur.

**Pre-iOS 26:** `expo-blur` `<BlurView intensity={N} tint="systemMaterial" />`.

**iOS 26+:** `expo-glass-effect` `<GlassView>` or `@callstack/liquid-glass` (Fabric/TurboModules, native UIVisualEffectView bridge with fallback).

Rules:
- Thicker materials = better text contrast.
- Always pair blur with vibrancy-aware label colors.
- Never animate `intensity` (frame stutter); never nest BlurViews.
- Always set `overflow: 'hidden'` + `borderRadius` on the parent.

- **Sources:** [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Expo GlassEffect docs](https://docs.expo.dev/versions/latest/sdk/glass-effect/), [Callstack — Liquid Glass in RN](https://www.callstack.com/blog/how-to-use-liquid-glass-in-react-native), [Expo blog — Liquid Glass + Expo UI](https://expo.dev/blog/liquid-glass-app-with-expo-ui-and-swiftui).

### Color — semantic tokens + P3 wide gamut
- Semantic colors (`label`, `secondaryLabel`, `tertiaryLabel`, `quaternaryLabel`, `systemBackground`, `secondarySystemBackground`, `tertiarySystemBackground`, `separator`, `opaqueSeparator`) **auto-adapt** to light/dark and increased-contrast.
- iOS 26 subtly retuned system colors for Liquid Glass harmony.
- P3 wide gamut (25% wider than sRGB) standard since iPhone 7.
- **For Potentijal RN:** build a token layer keyed on `useColorScheme()`. Use `PlatformColor('label')` and `PlatformColor('systemBackground')` to bridge to true iOS semantic colors (auto-adapts to dark + increased contrast for free). For wide gamut, set asset color profiles to Display P3 in Xcode asset catalogs.
- **Sources:** [Apple HIG Color](https://developer.apple.com/design/human-interface-guidelines/color), [Hacking with Swift — Semantic colors](https://www.hackingwithswift.com/example-code/uicolor/how-to-use-semantic-colors-to-help-your-ios-app-adapt-to-dark-mode).

### SF Symbols
~6,900 system icons (SF Symbols 7) designed to align with SF Pro. Nine weights match font weights; three scales control emphasis without changing weight.

- **For Potentijal RN:** use `expo-symbols` on iOS. For cross-platform, Lucide or Phosphor with matching stroke weights. **Never mix icon sets in the same view.**
- **Source:** [Apple HIG SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols).

### Haptics — when each
| Pattern | When |
|---|---|
| `selectionAsync` | Picker scrolls, toggles, segmented switches |
| `impactAsync('Light')` | Small UI element appears, gentle tap |
| `impactAsync('Medium')` | Card tap, drawer snap, primary button commit |
| `impactAsync('Heavy')` | Physical-feel events, drag-snap |
| `notificationAsync('Success')` | Workout logged, set saved |
| `notificationAsync('Warning')` | Form validation error |
| `notificationAsync('Error')` | API/network failure |

**Rule:** match haptic weight to visual weight. Reserve for moments; firing on every tap feels cheap. Always gate behind a user setting to disable.

- **Source:** [Expo Haptics docs](https://docs.expo.dev/versions/latest/sdk/haptics/), [Apple HIG Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics).

### Hairline borders (1px / 0.5pt)
Apple separators are 1 physical pixel = 0.5pt on @2x, 0.33pt on @3x. Plain `borderWidth: 1` looks chunky on Retina.

**For Potentijal RN:** `borderWidth: StyleSheet.hairlineWidth`. Color: `PlatformColor('separator')` (translucent) or `opaqueSeparator` (solid). Caveat on Android non-integer pixel ratios: provide fallback `Math.max(StyleSheet.hairlineWidth, 1)`.

- **Source:** [RN StyleSheet docs](https://reactnative.dev/docs/stylesheet).

### Optical alignment (not mathematical)
Asymmetric icons (play triangle, download arrow, chevrons) look off when geometrically centered. Apple HIG explicitly tells designers to shift icons a few pixels for optical centering. Play icons typically shift ~1–2pt right of center. SF Symbols handle this for you; custom icons need manual padding.

---

## Material Design 3 / Expressive — what to ignore

**Material 3 Expressive** (announced May 2025, shipped with Android 16 QPR1 in September 2025) is an extension of M3, not a v4. Larger headlines, heavier weights, 35 new shapes + shape-morphing, springier physics-based motion, richer color separation between primary/secondary/tertiary.

**For Potentijal:** since the app is iOS-first, **do not mix M3 into your iOS UI** — it will fight HIG and look hybrid/off. Use M3 only on the Android side via `react-native-paper` v5+. Maintain per-platform aesthetics; share layout, navigation logic, and content.

- **Sources:** [Google blog — M3 Expressive launch](https://blog.google/products-and-platforms/platforms/android/material-3-expressive-android-wearos-launch/), [m3.material.io](https://m3.material.io/), [Rocketfarm — Material vs HIG strategy](https://www.rocketfarmstudios.com/blog/material-design-or-human-interface-guidelines/).

The one Material 3 thing **worth using cross-platform:** the easing curves + duration tokens (see [Motion](#motion--micro-interactions--haptics) below). Google publishes them and they're better than ad-hoc bezier picks.

---

## Concrete design system specs

### Typography

#### Type scale ratios
| Ratio | Name | Best for |
|---|---|---|
| 1.125 | Major Second | Dense dashboards |
| 1.200 | Minor Third | Mobile UI default; subtle but readable |
| **1.250** | **Major Third** | **Safe default for mobile** ← recommended for Potentijal |
| 1.333 | Perfect Fourth | Editorial, deeply nested sections |
| 1.500 | Perfect Fifth | Hero/landing typography |
| 1.618 | Golden Ratio | Display only |

#### Recommended scale (16pt base, 1.25 ratio)
`11 / 13 / 15 / 17 / 20 / 24 / 30 / 36 / 48 / 60 / 72`

Common Apple/Tailwind-aligned variant (the cleaner option for Potentijal):
`12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60 / 72`

#### Line height
- Display (24pt+): **1.1–1.25** (tight, e.g. 1.15)
- Body (14–18pt): **1.4–1.5** (WCAG 2.1 1.4.12 requires no content loss at 1.5)
- Long-form reading: **1.5–1.6**
- Captions (≤12pt): **1.3–1.4**

#### Letter spacing
- Display 32pt+: **−1 to −2%** (tighten)
- Body 14–18pt: **0%**
- ALL-CAPS small labels (10–12pt): **+5 to +10%**
- Numerals/timers: 0% with **tabular figures** (`fontVariant: ['tabular-nums']` in RN)

#### Font weight hierarchy
- 400 Regular (body)
- 500 Medium (UI labels, button text)
- 600 SemiBold (subheadings, emphasis)
- 700 Bold (headings)
- Optional 300 Light for very large display only
- **Don't go below 400 on text under 18pt** — readability collapses

#### iOS native stack
- **SF Pro Display:** sizes ≥ 20pt
- **SF Pro Text:** sizes < 20pt (larger apertures, more letter-spacing)
- **SF Pro Rounded:** friendly/numeric UI
- iOS switches automatically when using `fontFamily: 'System'`

#### Premium fonts via `@expo-google-fonts`
| Font | Vibe | Use for |
|---|---|---|
| **Inter** | Neutral workhorse | UI body + labels |
| **Geist** (Vercel) | Modern, tight | UI hero numbers, code |
| **Space Grotesk** | Distinctive, athletic/tech | Display, brand |
| **Plus Jakarta Sans** | Warmer Inter alternative | Body |
| **DM Sans** | Geometric, small-screen-friendly | UI |
| **Satoshi** (Fontshare, free) | Premium | Brand display |
| **General Sans** (Fontshare, free) | Clean neutral | UI |

For Potentijal — current setup uses Geist (UI) + Space Grotesk (display). That's a strong pairing; keep it. The opportunity: lean into Space Grotesk for big hero numbers with -1.5% tracking and 1.0 line-height.

#### Numerical typography
- Tabular figures on **every** timer, stat, leaderboard, rep count, weight value: `fontVariant: ['tabular-nums']`
- Inter, SF Pro, Geist all support tabular figures
- **Source:** [Theo Soti tabular-nums](https://theosoti.com/short/tabular-nums/).

#### Dynamic Type
iOS has 12 user-selectable size categories (xSmall → xxxLarge, plus AX1–AX5 accessibility sizes). Body can scale 300%+ at AX5.

**For Potentijal RN:** `Text` honors system text scale by default. Don't disable `allowFontScaling`. Test at AX3 minimum. Allow text to wrap to 2+ lines instead of truncating.

### Color

#### 60-30-10 rule
60% neutral/background, 30% supporting, 10% accent/brand.

#### Radix Colors 12-step (gold standard)
| Step | Purpose |
|---|---|
| 1 | App background |
| 2 | Subtle background |
| 3 | UI element background (normal) |
| 4 | Hovered UI element background |
| 5 | Active/pressed UI element background |
| 6 | Subtle borders / separators (non-interactive) |
| 7 | UI element border / focus ring (interactive) |
| 8 | Hovered UI element border / stronger border |
| 9 | Solid background (highest chroma) |
| 10 | Hovered solid background |
| 11 | Low-contrast text |
| 12 | High-contrast text |

Uses APCA contrast algorithm.
- **Source:** [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).

#### Tailwind palette (11 steps, OKLCH in v4)
`50 / 100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 / 900 / 950`

500 = brand default; 600 = pressed/active; 50 = subtle tint; 950 = darkest surface.

#### Semantic token naming (recommended for Potentijal)
```
bg.canvas              // outermost screen background
bg.surface             // cards on canvas
bg.surface-elevated    // cards on cards
bg.subtle              // subtle fill (tags, chips)
border.subtle          // hairline dividers
border.default         // visible borders
border.strong          // focus rings, emphasis
border.focus           // accent-colored focus
text.primary           // 92% white in dark / true dark in light
text.secondary         // 60%
text.tertiary          // 38%
text.muted             // disabled
text.inverse           // text on accent backgrounds
accent.solid           // brand solid
accent.hover           // brand hover
accent.subtle          // brand tint
intent.success         // green
intent.warning         // amber
intent.danger          // red
intent.info            // blue
```

#### WCAG contrast
- **AA:** 4.5:1 normal, 3:1 large (≥18pt regular or 14pt bold), 3:1 UI components
- **AAA:** 7:1 normal, 4.5:1 large
- Touch targets: WCAG 2.5.5 (AAA) = 44×44 CSS px

#### Color blindness
~6% of men have deuteranopia/protanopia (red-green). **Never rely on red vs green alone** — pair with icon, shape, label, or position. Avoid red on dark backgrounds for critical states.

#### Dark mode strategy (this is where most fitness apps fail)
- **Avoid pure black (#000) on LCD** — causes smearing and harsh contrast; use `#0A0A0A`–`#121212`
- **OLED apps (Whoop, Apple Fitness) can use #000** to leverage pixel-off blacks
- **Avoid pure white text** — use `#EBEBF5` or `rgba(255,255,255,0.92)`
- **Elevation via lightness:** higher elevation = lighter surface (opposite of light mode)
  - `bg.canvas` = `#0F0F12`
  - `bg.surface` = `#16161A`
  - `bg.elevated` = `#1C1C22`
  - `bg.modal` = `#22222A`
- **Desaturate brand colors by ~20%** + brighten ~10% in dark mode; pure brand colors look radioactive
- **Lower border opacity:** `rgba(255,255,255,0.08)` subtle / `rgba(255,255,255,0.14)` default in dark vs. `rgba(0,0,0,0.08)` / `rgba(0,0,0,0.12)` in light
- **Source:** [Apple HIG Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode), [Sarunw Dark Color](https://sarunw.com/posts/dark-color/).

### Spacing + layout

#### Base grid
**8pt grid** is the dominant standard. Allow 4pt as half-step for icon+label gaps, badge padding. Most popular screen resolutions divide evenly by 8 — avoids half-pixel blur.

#### T-shirt spacing scale
| Token | px | Use |
|---|---|---|
| 2xs | 2 | Hairline, fine-tuning |
| xs | 4 | Icon-label gap, badge padding |
| sm | 8 | Compact list spacing |
| md | 12 | Compact card padding |
| **base** | **16** | **Default card padding, section gap** |
| lg | 24 | Section padding, premium card padding |
| xl | 32 | Major section gap |
| 2xl | 48 | Hero spacing |
| 3xl | 64 | Page-top hero |

#### Touch targets
- **iOS:** 44×44 pt minimum (HIG)
- **Android:** 48×48 dp minimum (Material)
- **WCAG 2.5.8 AAA:** 44×44 CSS px

#### Card / container padding
- Compact: 12–16 pt
- Standard: 16–20 pt
- Premium (Linear, Apple Fitness): 20–24 pt
- Screen horizontal margins: 16 / 20 / 24 pt

#### Border radius scale
`0 (hairline UI), 4 (tight), 8 (default), 12 (cards), 16 (large cards), 20 (sheets), 24 (hero cards), 28 (iOS modal), 999 (pill)`

iOS 26 Liquid Glass tab bars: ~28pt rounded with material background.

### Depth, shadows, materials

#### Layered shadow recipes (Josh Comeau method)
Match shadow hue to background brand color rather than pure black — feels more "designed."

**Small (subtle card)**
```
0.5px 1px 1px hsl(220 60% 50% / 0.7)
```

**Medium (raised card)**
```
1px 2px 2px hsl(220 60% 50% / 0.333)
2px 4px 4px hsl(220 60% 50% / 0.333)
3px 6px 6px hsl(220 60% 50% / 0.333)
```

**Large (modal/floating)**
```
1px 2px 2px hsl(220 60% 50% / 0.2)
2px 4px 4px hsl(220 60% 50% / 0.2)
4px 8px 8px hsl(220 60% 50% / 0.2)
8px 16px 16px hsl(220 60% 50% / 0.2)
16px 32px 32px hsl(220 60% 50% / 0.2)
```

#### 4-level elevation tokens for Potentijal
| Token | Use | RN spec |
|---|---|---|
| elev.0 | Flat on canvas | none |
| elev.1 | Card resting | `{ shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: {width:0,height:1}, elevation: 2 }` |
| elev.2 | Card hovered / floating button | `{ shadowOpacity: 0.10, shadowRadius: 12, shadowOffset: {width:0,height:4}, elevation: 4 }` |
| elev.3 | Modal / bottom sheet | `{ shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: {width:0,height:8}, elevation: 8 }` |

#### expo-blur
- `intensity` 1–100 (default 50); **start with 80–90 for iOS-quality look**
- iOS tints: `systemUltraThinMaterial / systemThinMaterial / systemMaterial / systemThickMaterial / systemChromeMaterial` (each with `Light` / `Dark`)
- **`systemChromeMaterial`** = floating tab bar / nav bar default
- **`systemThinMaterial`** = floating cards over content
- **`systemUltraThinMaterial`** = subtle hover overlays
- Always `overflow: 'hidden'` on parent with `borderRadius`
- Never animate `intensity`; never nest BlurViews
- **Source:** [Expo BlurView docs](https://docs.expo.dev/versions/latest/sdk/blur-view/).

#### Gradient scrims (over images)
- Bottom-to-top dark scrim for image+text overlay:
  - `rgba(0,0,0,0)` → `rgba(0,0,0,0.55)` (over the bottom 60% of image)
- Top scrim under status bar: `rgba(0,0,0,0.3)` → `rgba(0,0,0,0)` over 80–120pt

(This is what the Progress carousel cards already do — keep that, refine the stops.)

### Motion + micro-interactions + haptics

#### Reanimated `withSpring` defaults
- `damping: 10, mass: 1, stiffness: 100, energyThreshold: 6e-9`
- Closely mimics iOS `CASpringAnimation`

#### Apple-style spring presets (port to Reanimated)
| Preset | damping | stiffness | mass | Feel |
|---|---|---|---|---|
| **default** | 10 | 100 | 1 | Standard iOS |
| **snappy** | 26 | 280 | 1 | Quick, controlled (button press) |
| **bouncy** | 8 | 100 | 1 | Playful overshoot (celebration) |
| **smooth** | 20 | 170 | 1 | No bounce, gentle (sheet) |
| **interactive** | 25 | 300 | 0.5 | Drag-follow (gesture-driven) |

#### Duration conventions
- **100ms** — micro (state toggle, hover)
- **200–250ms** — standard (sheet, tab, accordion)
- **300ms** — emphasis (modal in)
- **400–500ms** — hero (onboarding, paywall reveal)
- **>600ms** feels sluggish — avoid except for hero scrub

#### Material 3 easing tokens (cross-platform-safe)
| Token | Cubic Bezier |
|---|---|
| Standard | `(0.2, 0, 0, 1.0)` |
| Standard accelerate | `(0.3, 0, 1, 1)` |
| Standard decelerate | `(0, 0, 0, 1)` |
| Emphasized | `(0.05, 0.7, 0.1, 1.0)` |
| Emphasized accelerate | `(0.3, 0, 0.8, 0.15)` |
| Emphasized decelerate | `(0.05, 0.7, 0.1, 1.0)` |
| Legacy ease-in-out | `(0.4, 0, 0.2, 1)` |

#### Material 3 duration tokens (ms)
`short1=50, short2=100, short3=150, short4=200, medium1=250, medium2=300, medium3=350, medium4=400, long1=450, long2=500, long3=550, long4=600, extra-long1=700, extra-long2=800, extra-long3=900, extra-long4=1000`

- **Source:** [Material 3 Easing & Duration](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs).

#### Stagger animations
- List item reveal: 30–50ms delay per item, max ~8 items animated; cap total at 400ms
- Use Reanimated `Layout` + `entering` with `delay`

#### Skeleton patterns
- Shimmer cycle: 1200–1500ms ease-in-out
- Skeleton color: 8% white over surface (dark mode) / 4% black over surface (light mode)
- Libraries: `react-native-modern-shimmer` (zero-deps) or `moti` for custom

---

## Component patterns

### Bottom sheets (`@gorhom/bottom-sheet`)
- `snapPoints={['25%', '50%', '90%']}` or absolute `[200, 500, 800]` (sort low → high)
- iOS native sheet detents: `medium` (~50%), `large` (~92%)
- Always include `enablePanDownToClose`
- Use `enableDynamicSizing` for content-driven heights
- **Source:** [Gorhom Bottom Sheet props](https://gorhom.dev/react-native-bottom-sheet/props).

### Tab bars
- **iOS 26+:** floating Liquid Glass, minimizes on scroll, ~64pt content height
- **Anchored** (classic): 49pt content + 34pt safe area = 83pt total
- Icon-only when ≥5 tabs; icon+label when ≤4
- Badge: 16pt circle, top-right of icon, brand-color, 10pt SemiBold tabular-nums

### Cards
| Style | When to use |
|---|---|
| **Filled** — tinted bg (Radix step 2/3), no border, no shadow | Modern, calm; dashboards (Linear, Whoop) |
| **Bordered** — 1pt step-6 border, no shadow | Clean, dense; lists |
| **Elevated** — white surface + elev.1 shadow | Traditional, premium feel; floating CTAs |

**Pick ONE style per surface; mixing looks chaotic.**

### Buttons
| Size | Height | H-padding | Radius | Text |
|---|---|---|---|---|
| sm | 32pt | 12 | 8 | 13pt/500 |
| md | 44pt | 16 | 10 | 15pt/500 |
| lg | 52pt | 20 | 12 | 16pt/600 |
| xl | 56pt | 24 | 14 | 17pt/600 |

- **Primary:** solid brand bg, white text
- **Secondary:** subtle bg (Radix step 3), step-12 text
- **Tertiary/Ghost:** transparent bg, step-11 text, step-6 border or none
- **Destructive:** red-9 bg, white text
- Tap target = 44pt minimum even if visual is smaller (extend `hitSlop`)

### Form inputs
- Height: 44pt (compact) / 52pt (default)
- Label-above for clarity; floating label only for dense forms
- Focus: 2pt step-8 ring + step-7 border
- Error: red-9 border + red-11 helper text + warning haptic

### Empty states (canonical pattern)
1. Optional illustration (max ~120pt, abstract > literal)
2. **Headline** ("No workouts yet") — 20pt SemiBold
3. **Body** ("Log your first workout to start tracking progress") — 15pt Regular, step-11
4. **Single primary CTA** ("Log workout")

Never multiple CTAs in an empty state.

- **Source:** [Eleken Empty State UX](https://www.eleken.co/blog-posts/empty-state-ux).

### Paywall (high-conversion template)
- Hero (animated > static — 2.9× conversion lift per RevenueCat)
- Value props as bulleted list (3–5 items, icon + 1-line)
- Plan toggle: Weekly / Yearly (badge "Save 60%") / Lifetime
- Free trial line: "7 days free, then $X/yr"
- Primary CTA: "Start free trial" (benefit-driven, not "Subscribe")
- Tiny legal + Restore / Terms / Privacy at bottom (11pt step-11)
- Dynamic/segmented paywalls show ~35% lift over static
- **Sources:** [Adapty Paywall](https://adapty.io/blog/how-to-design-a-paywall-for-a-mobile-app/), [RevenueCat Paywall Guide](https://www.revenuecat.com/blog/growth/guide-to-mobile-paywalls-subscription-apps/), [Apphud High-Converting Paywall](https://apphud.com/blog/design-high-converting-subscription-app-paywalls).

### Onboarding
- 3–5 carousel screens **OR** progressive disclosure (one ask per screen)
- **Pre-permission priming:** explain the *why* BEFORE the system dialog (3× opt-in rate)
- **"First win" within 60 seconds** — log a sample, complete a trivial action, see immediate value
- Delay account creation until value is felt (Duolingo's most-copied pattern)

### Toasts / snackbars
- Position: top (iOS notif convention) or bottom (above tab bar +16pt)
- Auto-dismiss: 4s info, 6s with action, **never auto-dismiss errors** (require dismiss)
- Single line + optional 1 action

---

## Data visualization for fitness

### Chart selection
| Type | Use |
|---|---|
| **Line** | Trend over time (HRV, weight, 1RM) |
| **Area** | Cumulative (volume, mileage) |
| **Bar** | Discrete comparison (weekly volume, set count) |
| **Sparkline** (inline ~40×120) | "This week trend" inside a stat card |
| **Heatmap calendar** | Workout consistency (GitHub-style) |
| **Radial/ring** | Goal completion |

### "Big number + sparkline" pattern (Whoop, Apple Health)
- **Primary number:** 36–48pt SemiBold tabular-nums
- **Label:** 13pt step-11 above
- **Delta:** 11pt (e.g., "+8% vs last week") with up/down arrow + semantic color
- **Sparkline:** 32–48pt tall, full card width, 2pt stroke, no axes

This is the highest-leverage card pattern for Potentijal's Progress tab.

### Activity ring recipe (port from Apple)
- **Stroke:** 24pt (Apple Watch is ~22pt on 44mm); scale stroke = `0.075 × diameter`
- **Diameter:** 240–320pt on phone hero
- **Start angle:** −90° (top)
- **Gap between rings:** 4pt
- **Gradient:** brand-9 → brand-11 along arc
- **Cap:** `round`
- **Source:** [Apple HIG Activity Rings](https://developer.apple.com/design/human-interface-guidelines/activity-rings).

### Heatmap calendar (GitHub-style)
- Cell: 10–12pt square, 2pt gap, 2pt radius
- 5-color scale (dark mode green):
  - none `#161B22` → `#0E4429` → `#006D32` → `#26A641` → `#39D353`
- Light mode green:
  - `#EBEDF0` → `#9BE9A8` → `#40C463` → `#30A14E` → `#216E39`

### Progress bars
- Linear thickness: 4pt subtle / 8pt standard / 12pt prominent
- Segmented "X of Y" for sets: gap 4pt, fill animates left-to-right with spring
- Circular: 6–10pt stroke at 60pt diameter; same gradient as activity rings

### Data-ink ratio (Tufte)
Strip gridlines, axis labels, legends unless required. For fitness, **the number IS the chart** — sparkline whispers context.

---

## Dark mode specifics

(See [Color > Dark mode strategy](#color) above for the recipe.)

Two non-obvious rules:

1. **Elevation = lightness**, not shadow. Modal sheets are *lighter* than the canvas behind them. Counter-intuitive for designers coming from web.
2. **Test on both OLED + LCD** — true black `#000` shimmers/smears on LCD scroll; use `#0A0A0A`–`#121212` as your true canvas color and reserve `#000` for OLED-only optional themes.

---

## App teardowns — 18 imitable references

The richest source library for screen-by-screen redesign work. Use during the actual redesign — open the relevant teardown next to the Potentijal screen you're working on.

### Fitness category (most relevant)

#### Strava — activity feed + post-activity card
- **Vibe:** Activity feed + leaderboard; gamified social proof; orange-on-white punch.
- **Steal:**
  1. **Post-activity "hero stat + map scrim"** — distance dominant numeric, time + pace beneath in 3-column row, map snapshot as textured background card. 4 facts in one glance.
  2. **Segment leaderboards as parallel narrative** — "you're 5th of 2,341" without opting in. Psychological dynamite.
  3. **Kudos = single-tap social calorie** — clap icon, no comment thread. Restraint as a feature.
- **Teardowns:** [Reflection: User Flows on Strava](https://medium.com/@loranvandenbosch/reflection-user-flows-design-patterns-on-strava-6a5c21c46e78), [Strava UI UX Case Study](https://medium.com/@wjun8815/ui-ux-case-study-strava-fitness-app-0fc2ff1884ba)
- **Visual ref:** [Mobbin — Health & Fitness](https://mobbin.com/explore/mobile/app-categories/health-fitness), [Page Flows — Strava Android](https://pageflows.com/android/products/strava/)

#### Whoop ⭐ closest model for Potentijal
- **Vibe:** Black canvas, three-color traffic-light vocabulary, single hero score earns the whole screen.
- **Steal:**
  1. **Three-dial home** (Sleep / Recovery / Strain) — identical treatment, position, interaction. Repetition IS the design system. Tap any dial → deep-dive page.
  2. **Green/Yellow/Red as entire color story** — 67–100 green, 34–66 yellow, 0–33 red. One palette, learned in 5 seconds, applied across charts, rings, notifications. Don't add a fourth color.
  3. **Glanceable → trend → biometric progressive disclosure** — same metric at three depths (number, 1wk/1mo trend, raw HRV/RHR). User self-selects depth.
- **Teardown:** [WHOOP Design Breakdown — 925 Studios](https://www.925studios.co/blog/whoop-design-breakdown)
- **Visual ref:** [The All-New WHOOP Home Screen](https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/)

#### Apple Fitness+ / Activity Rings
- **Vibe:** Three concentric rings as both icon and brand; Move=red, Exercise=green, Stand=blue.
- **Steal:**
  1. **Closed-ring metaphor** — geometric, not numeric. "Close your rings" is a UX command needing no translation.
  2. **SF Pro Rounded for numerics, SF Pro for labels** — athletic + friendly numerals against neutral labels.
  3. **Ring overlap = celebration animation** — pulse + confetti, but the ring icon never breaks. Celebration inside the existing object.
- **Ref:** [Apple HIG Activity Rings](https://developer.apple.com/design/human-interface-guidelines/activity-rings), [Apple HIG Charting Data](https://developer.apple.com/design/human-interface-guidelines/charting-data)

#### Nike Run Club
- **Steal:**
  1. **Post-run "share card" auto-composed** (route + stat overlay) before you ask — removes 3 decisions.
  2. **Personalized congratulation copy** — "Your fastest 5K this month," templated against your own history.
  3. **Full-screen colored modals for challenges** — each challenge gets its own brand identity (bespoke gradient + display type).
- **Ref:** [Page Flows — NRC onboarding (iOS)](https://pageflows.com/post/ios/onboarding/nike-run-club/), [Appcues — NRC gamification](https://goodux.appcues.com/blog/nike-run-club-gamification)

#### Peloton
- **Steal:**
  1. **Instructor profile as a destination** — ratings, follower count, library, signature playlist. If your app has trainers/creators, this is the template.
  2. **Target metric ranges** — cued band (e.g. cadence 85–95) overlaid on live number. Turns "am I doing it right?" into instant green/red.
  3. **Hideable HUD** — metrics chrome can be dismissed; respects attention.
- **Ref:** [Peloton UI/UX Case Study (Sharan Hegde)](https://sharanhegde.com/peloton-interactive-ui-ux-case-study/)

#### Future (1:1 coaching)
- **Steal:**
  1. **Coach avatar pinned to top of every screen** — reinforces "a human made this for me."
  2. **Workout cards with a "from your coach" note** — converts a static plan into a personal letter.
  3. **Daily check-in chat thread as home** — today's workout lives inside the chat, not in a separate "Plan" tab.

#### Fitbod / Strong / Hevy (strength logging — direct competitors)
- **Steal:**
  1. **One-tap set logging** (Strong's "check the set" gesture) — single tap = complete with last values prefilled. Gold standard for input ergonomics.
  2. **Plate calculator overlay** — tap weight → modal shows "45 + 25 + 10 per side." Tiny, niche, beloved.
  3. **Fitbod's muscle-group readiness body diagram** — anatomical heat map of soreness. Metadata as image readable in 0.5s.

#### Garmin Connect (anti-pattern — what NOT to do)
- **Avoid:**
  1. Endless homepage scroll of widgets (20+ cards in arbitrary order).
  2. Settings nested 5 levels deep.
  3. Every metric with equal visual weight; no hero, no hierarchy.

### Premium productivity (typography + motion lessons)

#### Linear ⭐ typography + motion model
- **Vibe:** "Professional, calm, fast." Dark-first, Inter, tight micro-motion.
- **Steal:**
  1. **Inter Variable with negative letter-spacing** — `-0.22px` display, `-0.11px` body.
  2. **8px spacing scale + 6–10px corner radii** — small, repeatable rhythm.
  3. **Subtle motion nobody notices** — hover lifts, contextual fades, no bouncy springs. Internal rule: "if you immediately notice it, it's wrong."
- **Teardowns:** [The Rise of Linear-Style Design](https://medium.com/design-bootcamp/the-rise-of-linear-style-design-origins-trends-and-techniques-4fd96aab7646), [Design System Analysis: Linear](https://getdesign.md/linear.app/design-md), [Linear — A calmer interface](https://linear.app/now/behind-the-latest-design-refresh)

#### Things 3 ⭐ iOS gold standard
- **Vibe:** Calm, generous spacing, single bold action surrounded by quiet content.
- **Steal:**
  1. **Magic Plus Button** — tap = new item; **drag = insert at exactly that row/heading/day.** The button is also the insertion cursor. Most-copied iOS pattern in 10 years.
  2. **Type ramp on single family at three weights** — large list titles, medium task titles, small metadata. Clear hierarchy with zero color reliance.
  3. **Haptic Engine choreography** — pickup, dropoff, completion — each a distinct tap. Haptics are a hidden brand asset.
- **Teardown:** [Things 3: Beauty and Delight — MacStories](https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/)

#### Arc Browser
- **Steal:**
  1. **Per-space gradient theming** — choose 2-color gradient per workspace; chrome adopts it. Color = context.
  2. **Vertical sidebar nav** — tabs as a readable, foldered, hierarchical list.
  3. **Personality through naming** — "Boosts," "Spaces," "Easels." Branded nouns make the app discussable.

#### Superhuman
- **Steal:**
  1. **Cmd+K command palette as teacher** — typing the action label shows its shortcut.
  2. **Single-letter shortcuts** (E = archive, R = reply).
  3. **Stripped chrome + dense info** — the inbox row IS the UI.

#### Raycast
- **Steal:**
  1. **Extreme restraint as a vibe** — Inter ss03 + 1px hairline borders + 6–10px radii.
  2. **Live-previewing theme picker** — hover a theme → entire app re-skins instantly. "Try before commit" embedded in selection.
  3. **Saturated accents only on integration tiles** — 95% monochrome; color = meaning.

#### Notion Calendar (ex-Cron) ⭐ typography moonshot
- **Steal:**
  1. **5.3:1 typographic ratio** — 64px H1 vs 12px label. Most apps live around 1.5–2:1. This decision alone communicates importance without color or shadow.
  2. **−2.125px letter-spacing on display + line-height 1.0** — poster-tight, architectural.
  3. **Keyboard-first calendar** — arrow = day nav, `n` = new event, `g` = go-to-date.

#### Apple Wallet
- **Steal:**
  1. **Overlapping card stack**, top edge only visible — instant "thumb through wallet" mental model.
  2. **Tap-to-elevate** — small Z-axis shadow + scale confirms selection without modals.
  3. **Long-press to reorder** — reuses iOS-system muscle memory.

#### Apple Health
- **Steal:**
  1. **Today = horizontal bar; history = vertical histograms** — same data, different form factor by time scope.
  2. **Category color persists everywhere** — heart=red, sleep=indigo. Once learned, color tells you the metric.
  3. **"Highlights" cards above raw data** — algorithmic interpretation up top, drill into raw below.
- **Ref:** [Apple WWDC22 — Design an effective chart](https://developer.apple.com/videos/play/wwdc2022/110340/)

#### Apple Music
- **Steal:**
  1. **Color-extracted backgrounds** — pull 2–3 dominant colors from artwork → derive bg gradient and tint. Every screen bespoke without designer effort.
  2. **Foreground text = pure white or pure black** — readable against any extracted palette.
  3. **Motion artwork loops** — 6–12s subtle animated cover. Life without distraction.

#### Apple Weather
- **Steal:**
  1. **Dynamic full-screen background tied to live conditions** — rain animates, sun moves with time-of-day, fog adds depth. Apply to any "state of X" screen.
  2. **Data modules over translucent cards** — small frosted-glass cards floating on the scene. Density without breaking mood.

#### Headspace / Calm
- **Steal:**
  1. **Emotion-mapped color palettes per content type** — focus=warm orange, sleep=deep navy + stars, calm=soft blue/sage.
  2. **One-minute animated explainer as onboarding** — replaces a long form with a hosted experience.
  3. **Voice-led product** — your audio identity is a design surface.
- **Teardown:** [Headspace — Designing for Calm (Crosley)](https://blakecrosley.com/guides/design/headspace)

#### Duolingo ⭐ gamification
- **Steal:**
  1. **Streak + Streak Freeze** — loss aversion as feature; freeze keeps streak alive, increasing average streak length ~48%. Don't punish — insure.
  2. **Mascot with emotional states** — happy/sad/dead Duo gives the brand a face that can be disappointed.
  3. **Weekly leagues with promotion/demotion** — tiered leaderboards reset weekly; new users always have a chance to climb. Fitness apps under-use this.
- **Teardown:** [Duolingo UX Design Breakdown — 925 Studios](https://www.925studios.co/blog/duolingo-design-breakdown)

---

## Apple-grade polish checklist for RN/Expo

This is the drop-in to-do for the Potentijal redesign. Every box checked = a tier-up of perceived quality.

1. **Replace all hex text/background with `PlatformColor` semantic tokens** — instant dark mode + Liquid Glass harmony.
2. **Adopt `expo-glass-effect` `<GlassView>` for tab bar / nav background** on iOS 26+; fall back to `expo-blur` `<BlurView intensity={85} tint="systemChromeMaterial" />` on older iOS. Floating capsule shape.
3. **`StyleSheet.hairlineWidth` for every divider/border.** Never `borderWidth: 1` for separators.
4. **System font + Dynamic Type** — `fontFamily: 'System'`, never disable `allowFontScaling`. Use the type-style scale (largeTitle 34, title1 28, body 17, caption 12) — let optical sizing happen.
5. **Reanimated springs everywhere interactive** — `{ damping: 15, stiffness: 150 }` baseline; `{ damping: 20, stiffness: 200 }` for sheets; no linear timing for user-driven UI.
6. **Haptics with restraint** — Selection on toggles/pickers, Impact medium on commit actions, Notification only on success/error outcomes. Never on every tap.
7. **SF Symbols via `expo-symbols` on iOS**, weight-matched to surrounding text weight. Lucide at the same stroke weight as Android equivalent.
8. **Sheet detents via React Navigation native stack** (`sheetAllowedDetents`, `sheetGrabberVisible`) or `@gorhom/bottom-sheet`.
9. **Optical icon centering** in circular buttons — manual padding for play triangles, etc.
10. **Test against Reduce Transparency, Increase Contrast, Larger Text AX3+** — all in iOS Settings → Accessibility.
11. **Don't bring Material 3 Expressive into iOS UI.** Single-platform aesthetics or maintain a per-platform theme.
12. **Tabular figures** (`fontVariant: ['tabular-nums']`) on every number/timer/stat.

---

## Highest-ROI changes for Potentijal

Synthesized from the research + the current state described in `CLAUDE.md` (Home, Workouts, Progress, History tabs; meals/ is Progress; sport modes recently removed; user-defined presets are the new exercise builder).

Ordered by impact ÷ effort:

### Tier 1 — biggest visual lift, ≤2 days each

1. **Adopt a 4-token type scale + numeric specialization.** Use Space Grotesk for hero numbers (large, tight letter-spacing, `tabular-nums`), Geist for everything else. Establish a clear hierarchy: `hero:64 / xl:24 / base:17 / sm:13`. Apply across Home + Progress + History.
2. **Establish the 8pt grid + 9-token spacing scale.** Audit current spacing values — Luke probably has 30+ unique paddings. Collapse to `{2/4/8/12/16/24/32/48/64}`.
3. **Build the dark-mode color token layer.** `bg.canvas / bg.surface / bg.elevated`, `text.primary / .secondary / .tertiary`, `border.subtle / .default`, `accent.solid / .subtle`. Use `PlatformColor` on iOS for semantic auto-adaptation.
4. **Replace all dividers with `StyleSheet.hairlineWidth` + `PlatformColor('separator')`.** Free polish.
5. **Add haptics on commit moments only** — set logged, workout saved, PR hit, paywall purchase. Strip from incidental taps.

### Tier 2 — pattern adoptions, 2–5 days each

6. **Whoop-style three-dial Home** — three identical-treatment hero metrics. Candidates: Today's workout / Weekly streak / Recent PR. Replace whatever's there now.
7. **Strava-style post-workout summary** — hero stat (volume or top set), 3 secondary stats in a row, a workout-density "scrim" or sparkline as the card background. The current end state is under-invested per the brief.
8. **Things 3-style draggable Magic Plus** — single floating button as both "add" and "insertion cursor" for presets/workouts on the Home and Workouts tabs.
9. **iOS 26 floating capsule tab bar** with `expo-glass-effect` on iOS 26+. Shrink on scroll.
10. **Skeleton screens on every >300ms load** — Progress tab graphs, History list, AI Trainer chat warmup. Plus optimistic UI on "mark set complete."

### Tier 3 — habit-forming + retention, 5+ days

11. **Streak + Streak Freeze** — apply Duolingo's mechanic (already discussed in CLAUDE.md as deferred). Loss-aversion increases average streak length ~48%.
12. **Heat-map calendar for workout consistency** — GitHub-style, on the Progress tab. Cheaper than another graph and immediately legible.
13. **"Big number + sparkline" cards** for every Progress tab metric — 36–48pt SemiBold tabular-nums + 32–48pt sparkline. Replace any pure-number or pure-chart card.
14. **Activity ring on Home** for weekly schedule completion (showing partial progress to leverage goal-gradient).
15. **Peak-end post-workout celebration** — short Reanimated celebration on PR or streak protection: confetti + impact medium haptic + custom copy. Don't overdo — fire only on real wins.

### Tier 4 — premium feel, ongoing

16. **Pre-permission priming** for notifications/health permissions — explain why before the OS dialog.
17. **Empty states with single CTA** — every "you haven't logged X yet" state gets the canonical 4-part template.
18. **Paywall refresh** — 3-plan toggle, value props with icons, animated hero, "Start free trial" CTA, tiny restore/legal at the bottom.
19. **Dynamic Type compliance** — test at AX3, allow wrap, don't truncate.
20. **Per-platform aesthetics** — keep Liquid Glass on iOS, Material 3 Expressive on Android, share content/logic.

---

## Contradictions + uncertainties

These are tensions the synthesis can't resolve — flagged so future Luke knows where the call is.

1. **Liquid Glass adoption vs. usability.** Apple is signaling pressure (gallery curation, rumored Xcode opt-out removal), but NN/g + AppleVis flag real legibility regressions. **Resolution path:** adopt the **shape language** (floating capsules, larger headlines, more rounded corners) **now**; use the **translucent material selectively** only where backgrounds are controlled. Always test Reduce Transparency + Increase Contrast.

2. **Hooked / variable rewards ethics.** Same mechanism powers Duolingo streaks (broadly net-good) and casino slots (predatory). **Resolution path:** Eyal's Manipulation Matrix — only build the loop if it materially improves the user's life **and you'd use it yourself**. For Potentijal: PR celebrations + streak protection = ethical; manufactured urgency or fake-progress notifications = not.

3. **iOS 26 design isn't fully settled.** Inconsistent corner radii across Apple's own macOS 26 apps as of January 2026 suggests the system is still in flux. **Resolution path:** don't over-commit to bleeding-edge patterns that may shift in iOS 27. Pick durable elements (semantic colors, springs, haptics) and treat the rest as tasteful adoption.

4. **Miller's 7±2 is widely over-cited.** The chunking principle is real; the literal "7" is a UX myth. **Resolution path:** group, but don't use "7" to justify arbitrary caps.

5. **Skeleton screens aren't universally better.** For sub-2s ops, a brief spinner or no indicator can be cleaner. **Resolution path:** use skeletons on content-heavy loads (feed, history, profile), spinners on quick form submits, no indicator on optimistic toggles.

6. **Variable reward schedules vs. notification fatigue.** Variable rewards work psychologically but only when notifications are not annoying. **Resolution path:** rich content notifications, contextual timing (post-shower, post-coffee), respect Do Not Disturb, batch instead of fire-and-forget.

---

## Open questions + next research threads

1. **Component-by-component refactor plan for Potentijal.** Go screen-by-screen with this Deep Dive open — Home / Workouts / Progress / Settings. Output: a checklist per screen of what changes physically.
2. **Audit 5 "Apple-grade" RN/Expo apps on the App Store.** Candidates: Cron/Notion Calendar (if RN), Linear Mobile, Things 3, Whoop, Strava. Identify their visual techniques via Mobbin teardowns + (where ethical) JS bundle inspection.
3. **Build a unified design-token TypeScript layer** that resolves to `PlatformColor` on iOS and computed hex on Android. Single source of truth; auto-respects dark mode + accessibility.
4. **Onboarding flow redesign for Potentijal.** v1.1 flow exists (identity → sport-selection → first-win → visualization → email-entry → email-verification → name-entry) per CLAUDE.md. Map to CREATE funnel; identify drop-off risks; apply Duolingo "time-to-first-success" reordering (defer account creation).
5. **Paywall A/B test framework.** Static vs. dynamic vs. segmented. RevenueCat supports paywall offering experiments. ~35% lift potential.
6. **AI Trainer chat UI redesign.** Currently a Modal. Could absorb learnings from Superhuman command palette + Future's coach chat + ChatGPT mobile.

---

## Historical analogues

### Flat design (iOS 7, 2013) → iOS 26 (2025)
Each major Apple design overhaul (Aqua 2001 → iOS 7 flat 2013 → iOS 26 Liquid Glass 2025) follows the same pattern:

1. **Announce.** Mixed reception. Devs complain.
2. **Curate.** Apple ships its own apps in the new style; flagship third-party apps follow.
3. **Pressure.** Future Xcode rumors signal opt-out is going away.
4. **Settle.** Subsequent OS versions refine the rough edges (iOS 7.1 softened iOS 7's harshness; expect iOS 27 to do similar for Liquid Glass).

**Lesson:** the right pace is "deliberate early adopter" — adopt the shape language and durable primitives; selectively use the bleeding-edge material; don't ship the rough edges to users.

### Material You (2021) → Material 3 Expressive (2025)
Material You's headline was dynamic color from wallpaper. Material Expressive's headline is motion + larger headlines + shape morphing. Direction of travel: **more personality, more motion, more shape.** Mirrors the Liquid Glass shift on iOS — both platforms are moving toward more expressive, animated, content-aware UIs.

**Lesson for cross-platform RN:** if you must share a system, share the *durable middle* — type scale, spacing scale, semantic color tokens, motion timing tokens — and let the surface (materials, blurs, exact shapes) differ per platform.

### Web design 2010s → 2020s: the great flattening + return to depth
Web went flat (2014–2018) → returned to subtle depth and glass (2020–) → exploded into Vercel/Linear-style monochrome restraint (2022–). Mobile is following the same arc: depth is back, but used **sparingly** — only on the navigation layer, not decoratively. This is exactly what iOS 26 codifies.

---

## Where to keep going

- Bookmark [Laws of UX](https://lawsofux.com/) — entire site.
- Bookmark [Mobbin](https://mobbin.com/) — best app screenshot library.
- Bookmark [Built for Mars](https://builtformars.com/) — Peter Ramsey's case studies.
- Bookmark [refactoringui.com](https://refactoringui.com/) — Schoger + Wathan's principles.
- Subscribe (free) to [getdesign.md](https://getdesign.md/) — teardowns of Linear, Superhuman, Raycast, Notion Calendar.
- Follow on Twitter/X: Steve Schoger, Adam Wathan, Erik D. Kennedy, Jordan Singer, Soleio, Vitaly Friedman, Sebastien Gabriel.

**Companion files:**
- [[mobile-app-design-psychology-2026-brief|Brief]] — the executive summary
- [[mobile-app-design-psychology-2026-sources|Sources]] — all 78 sources organized by topic

**Topic hub:** [[Design]]
