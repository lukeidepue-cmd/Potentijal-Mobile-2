# Loading screen assets

## Required: background image

Put your **loading background image** here with this exact name:

- **`loading-background.png`**

Used for:
1. **Native splash screen** (first screen when the app opens) – full-screen background.
2. **React loading screens** (spinning star while auth/onboarding load) – same background with a centered spinning star.

If your image is JPG, name it `loading-background.jpg` and update the path in:
- `app/_layout.tsx` (change `loading-background.png` to `loading-background.jpg` in the `require()`)
- `app.json` (in the `expo-splash-screen` plugin, change `loading-background.png` to `loading-background.jpg`).

## Optional: star on native splash

The native splash screen can only show one static image (no animation). Right now it shows **only** your background image. The **spinning star** appears as soon as the app’s JavaScript loads (on the two React loading screens).

If you want the **star to appear on the very first splash** (before JS loads), create a single image that combines your background and the star (same size and position as in the app: centered, 220×220 pt). Save it as e.g. `splash-with-star.png` and we can point the splash plugin to that file instead.
