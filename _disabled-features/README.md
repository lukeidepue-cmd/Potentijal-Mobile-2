# Disabled features

Code parked outside the `app/` directory so expo-router does not include it in
the route tree.

## profile/

The whole profile + social system, gated off by `PROFILE_FEATURES_ENABLED=false`
in `constants/features.ts`. It was moved here during the SDK 57 upgrade
(Sept 2026) because `profile/index.tsx` imports `expo-av`, which SDK 55 removed
from Expo Go — expo-router builds its route tree from the filesystem, so the
file was being required (and crashing the app on launch) even though every
entry point to it was switched off.

Nothing here has been edited. To revive it:

1. Move `profile/` back to `app/(tabs)/profile/`.
2. **Migrate `index.tsx` off `expo-av`** (`Video`, `ResizeMode`, `Audio`) to
   `expo-video` + `expo-audio`. expo-av is unmaintained and will not run.
3. Re-add the `<Tabs.Screen name="profile" options={{ href: null }} />` entry in
   `app/(tabs)/_layout.tsx`.
4. Restore the creator-workouts back-navigation in `app/(tabs)/history/[id].tsx`.
5. Flip `PROFILE_FEATURES_ENABLED` to `true`.

Note `lib/api/profile.ts` is NOT part of this — it is used by live screens and
stays where it is.
