/**
 * Expo app config. Runs at build time (local and EAS).
 * Injects EXPO_PUBLIC_SUPABASE_* from environment into extra so production
 * builds get real Supabase URL/anon key when EAS secrets are set.
 * Keeps app.json free of real secrets (placeholders only).
 */
const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      // At EAS build time, set EAS secrets EXPO_PUBLIC_SUPABASE_URL and
      // EXPO_PUBLIC_SUPABASE_ANON_KEY so login/API calls work in production.
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? appJson.expo.extra.supabaseUrl,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? appJson.expo.extra.supabaseAnonKey,
    },
  },
};
