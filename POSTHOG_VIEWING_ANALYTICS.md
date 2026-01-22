# How to View Analytics in PostHog

## Where to See Your Events

### 1. **Activity/Events Tab**
1. Go to your PostHog dashboard: https://app.posthog.com
2. Click on **"Activity"** or **"Events"** in the left sidebar
3. You should see events appearing in real-time (with a small delay for batching)

### 2. **Live Events**
1. In PostHog, go to **"Activity"** → **"Live events"**
2. This shows events as they come in (most up-to-date view)

### 3. **Insights/Dashboards**
1. Go to **"Insights"** in the left sidebar
2. Create a new insight to analyze specific events
3. You can filter by event name, user properties, etc.

## What Events Should You See?

With the current setup, you should see:

1. **`$identify`** - When a user logs in (with their user ID and properties)
2. **`$screen`** - Screen views as you navigate (e.g., `(tabs)/home`, `(tabs)/workouts`)
3. **`app_opened`** - Test event sent 2 seconds after app opens
4. **`$app_installed`** - When the app is first installed
5. **`$app_updated`** - When the app is updated

## Why Events Might Not Appear Immediately

PostHog batches events for performance:
- **Current setting**: Events are sent after **1 event** or every **10 seconds** (for faster testing)
- **Production setting**: Events are sent after **20 events** or every **30 seconds**

This means:
- If you navigate quickly, events might queue up
- Events will appear within 10 seconds of the action
- For immediate testing, you can manually flush (see below)

## Testing PostHog is Working

### Check Console Logs
Look for these logs in your Expo console:
- `✅ [PostHog] User identified: [user-id]`
- `📊 [PostHog] Screen viewed: [screen-name]`
- `📊 [PostHog] Test event sent: app_opened`

### Force Flush Events (For Testing)
If you want to see events immediately, you can add this to any component:

```typescript
import { usePostHog } from 'posthog-react-native';

function TestComponent() {
  const posthog = usePostHog();

  const testEvent = () => {
    posthog.capture('test_button_clicked', {
      test: true,
      timestamp: new Date().toISOString(),
    });
    posthog.flush(); // Force send events immediately
    console.log('📊 [PostHog] Test event sent and flushed');
  };

  return <Button onPress={testEvent} title="Test PostHog" />;
}
```

## Common Issues

### No Events Showing Up

1. **Check API Key**: Make sure `EXPO_PUBLIC_POSTHOG_API_KEY` is set correctly in `.env`
2. **Check Host**: Verify `EXPO_PUBLIC_POSTHOG_HOST` matches your PostHog instance
3. **Check Console**: Look for PostHog error messages
4. **Wait a bit**: Events are batched, so wait 10-30 seconds
5. **Check Project**: Make sure you're looking at the correct PostHog project

### Events Appear But No User Data

- User identification happens on login
- Check that you see: `✅ [PostHog] User identified: [user-id]` in console
- If not, the user might not be logged in

### Screen Views Not Tracking

- Screen views are tracked manually using Expo Router's `useSegments()`
- You should see: `📊 [PostHog] Screen viewed: [screen-name]` in console
- If not, check that you're navigating between screens

## Production Settings

For production, update `providers/PostHogProvider.tsx`:

```typescript
flushAt: 20,        // Send after 20 events
flushInterval: 30,  // Or every 30 seconds
```

This reduces network requests and improves battery life.
