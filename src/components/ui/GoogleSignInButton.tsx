import React from 'react';
import { Pressable, Text } from 'react-native';
import { signInWithGoogle } from '../../supabase/oauth';

export default function GoogleSignInButton() {
  const signIn = async () => {
    try {
      await signInWithGoogle();
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
