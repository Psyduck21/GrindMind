// Supabase environment configuration.
// Prefer the new publishable key env var, otherwise fall back to the legacy anon key.
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://oqwxvaihozrvjhnkozja.supabase.co';
const PUBLISHABLE = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!PUBLISHABLE) {
  throw new Error(
    'Missing Supabase publishable key. Please set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
  );
}

export const SUPABASE_CONFIG = {
  URL,
  ANON_KEY: PUBLISHABLE,
};
