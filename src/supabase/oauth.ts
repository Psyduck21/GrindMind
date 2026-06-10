import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './client';

// Helper to perform the native OAuth flow for Google on Expo.
// Uses `skipBrowserRedirect: true` and `WebBrowser.openAuthSessionAsync`.
export async function signInWithGoogle() {
  try {
    const redirectUri = AuthSession.makeRedirectUri();

    const { data, error } = await (supabase.auth as any).signInWithOAuth(
      { provider: 'google', options: { redirectTo: redirectUri } },
      { skipBrowserRedirect: true }
    );

    if (error) throw error;
    if (!data?.url) throw new Error('No auth URL returned from Supabase');

    const result = await WebBrowser.openAuthSessionAsync(data.url);
    const returnedUrl = (result as any)?.url as string | undefined;
    if (!returnedUrl) return null;

    const params = parseUrlParams(returnedUrl);
    if (params.access_token) {
      const { data: sessionData, error: setError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (setError) throw setError;
      return sessionData;
    }

    // Fallback: try Supabase helper if available
    if ((supabase.auth as any).getSessionFromUrl) {
      try {
        const res = await (supabase.auth as any).getSessionFromUrl({ storeSession: true });
        return res?.data ?? null;
      } catch (e) {
        console.error('getSessionFromUrl fallback failed', e);
      }
    }

    return null;
  } catch (e) {
    console.error('signInWithGoogle error', e);
    throw e;
  }
}

function parseUrlParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  let paramsString = '';
  if (hashIndex >= 0) paramsString = url.substring(hashIndex + 1);
  else if (queryIndex >= 0) paramsString = url.substring(queryIndex + 1);
  const params = new URLSearchParams(paramsString);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}
