# PostHog Analytics Setup

PostHog has been integrated into the app for product analytics, feature flags, and user tracking.

## Setup Instructions

### 1. Get Your PostHog API Key

1. Go to your PostHog dashboard: https://app.posthog.com
2. Navigate to **Project Settings** → **Project API Key**
3. Copy your API key (it will look like: `phc_...`)

### 2. Get Your PostHog Host URL

- **US Cloud**: `https://us.i.posthog.com` (default)
- **EU Cloud**: `https://eu.i.posthog.com`
- **Self-hosted**: Your custom PostHog instance URL

### 3. Add Environment Variables

Add the following to your `.env` file in the `my-first-app` directory:

```env
EXPO_PUBLIC_POSTHOG_API_KEY=your_api_key_here
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Note:** If you're using the US cloud (default), you can omit `EXPO_PUBLIC_POSTHOG_HOST`.

### 4. Restart Expo

After adding the environment variables:

1. Stop your Expo dev server (Ctrl+C)
2. Restart it with: `npx expo start --clear`

The `--clear` flag ensures the new environment variables are loaded.

## Features Enabled

The PostHog integration includes:

- ✅ **Automatic Screen View Tracking** - Tracks when users navigate between screens
- ✅ **Application Lifecycle Events** - Tracks app opened, backgrounded, etc.
- ✅ **Deep Link Tracking** - Tracks when users open the app via deep links
- ✅ **User Identification** - Automatically identifies users when they log in
- ✅ **User Properties** - Tracks user profile data (email, username, premium status, etc.)

## Usage

### Automatic Tracking

Most tracking happens automatically:
- Screen views are tracked automatically
- User identification happens automatically on login/logout
- App lifecycle events are tracked automatically

### Manual Event Tracking

To track custom events, use the `usePostHog` hook:

```typescript
import { usePostHog } from 'posthog-react-native';

function MyComponent() {
  const posthog = usePostHog();

  const handleButtonClick = () => {
    posthog.capture('button_clicked', {
      button_name: 'workout_start',
      screen: 'home',
    });
  };

  return <Button onPress={handleButtonClick} />;
}
```

### Feature Flags

To use feature flags:

```typescript
import { useFeatureFlag } from 'posthog-react-native';

function MyComponent() {
  const showNewFeature = useFeatureFlag('new_feature');

  if (showNewFeature) {
    return <NewFeatureComponent />;
  }

  return <OldFeatureComponent />;
}
```

## Verification

Once you've added your API key and restarted:

1. Open the app
2. Check the console for: `✅ [PostHog] Initialized successfully`
3. Navigate between screens - you should see events in your PostHog dashboard
4. Log in - you should see user identification events

## Important Notes

- The PostHog API key is safe to expose client-side (it's designed for this)
- PostHog will only track events when the API key is configured
- If the API key is missing, the app will still work but analytics won't be tracked
- Debug mode is enabled in development (`__DEV__`) for easier debugging
