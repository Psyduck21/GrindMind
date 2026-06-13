// Supabase environment configuration.
// Prefer the new publishable key env var, otherwise fall back to the legacy anon key.
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oqwxvaihozrvjhnkozja.supabase.co';
const PUBLISHABLE = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!PUBLISHABLE) {
  // In development we prefer to warn and allow the app to boot so the developer
  // can iterate without secrets configured. In production we still throw to
  // avoid silently deploying a broken app.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Missing Supabase publishable key. Please set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      'Warning: Supabase publishable key missing. Set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY to enable auth.'
    );
  }
}

export const SUPABASE_CONFIG = {
  URL,
  ANON_KEY: PUBLISHABLE || 'dummy-key-to-prevent-crash',
};
