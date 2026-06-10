**Google OAuth Setup (Supabase + Expo)**

This document shows step-by-step instructions to enable Google sign-in for this project and a minimal client example for Expo.

1) Create OAuth credentials in Google Cloud Console
- Go to https://console.cloud.google.com/apis/credentials
- Create an OAuth 2.0 Client ID (Application type: Web application).
- Add this Redirect URI (required by Supabase):

  `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`

  (Replace `<YOUR_PROJECT_REF>` with your Supabase project id / host.)

- Copy the Client ID and Client Secret.

2) Configure Supabase Dashboard
- Open Project → Authentication → Providers → Google.
- Paste the Google Client ID and Client Secret and enable the provider.
- Open Project → Authentication → Settings → Redirect URLs and add the redirect(s) you will use from your app, for example:

- `https://auth.expo.io/@your_expo_username/your-app-slug` (Expo managed, when using the Expo proxy)
- `exp://` or your custom scheme if you use a dev client or custom scheme (add exact values you plan to use)

3) How it works (flow summary)
- The OAuth flow starts from the app and opens a browser to the Supabase OAuth URL.
- Google redirects back to Supabase (`/auth/v1/callback`) which exchanges tokens and then redirects to your app via the `redirectTo` param you supplied when starting the flow.
- For this reason, only the Supabase callback needs to be registered in Google; your app's deep link is registered in Supabase's Redirect URLs.

4) Client example (Expo)

- Install these packages if you don't have them:

```bash
npm install expo-auth-session expo-web-browser
```

- Minimal `GoogleSignInButton` example (place at `src/components/ui/GoogleSignInButton.tsx`):

```tsx
import React from 'react';
import { Pressable, Text } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../supabase/client';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignInButton() {
  const signIn = async () => {
    try {
      // Make a redirect URI that works with the Expo proxy in dev
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri },
      });

      if (error) throw error;
      if (data?.url) {
        // Opens the browser and completes the OAuth flow
        await AuthSession.startAsync({ authUrl: data.url });

        // After the redirect back to your app, Supabase sets the session.
        // Depending on your setup you may call `supabase.auth.getSessionFromUrl()` here.
      }
    } catch (err) {
      console.error('Google sign-in failed', err);
    }
  };

  return (
    <Pressable onPress={signIn} style={{ padding: 12, backgroundColor: '#fff', borderRadius: 8 }}>
      <Text>Sign in with Google</Text>
    </Pressable>
  );
}
```

5) Notes and troubleshooting
- Make sure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set in your environment (see `.env` or `app.json`).
- If using the Expo proxy (`useProxy: true`) add `https://auth.expo.io/@your_expo_username/your-app-slug` to Supabase Redirect URLs.
- If sessions are not appearing after the redirect, try enabling `detectSessionInUrl` in the Supabase client options while debugging, or call `supabase.auth.getSessionFromUrl()` after the redirect.
- For production on iOS/Android, configure a custom scheme or a secure redirect and add it to Supabase Redirect URLs.

6) Security reminder
- Never embed the Supabase Service Role key in the client. Use the anon/public key in the app and run privileged actions from a server using the service role key.
