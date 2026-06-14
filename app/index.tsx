import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../src/supabase/client';
import { useAuthStore } from '../src/stores/useAuthStore';
import { COLORS } from '../src/constants/theme';

import { db } from '../src/db/db';
import { clearDatabase } from '../src/db/schema';
import { runFullSync } from '../src/services/sync/syncEngine';

export default function AuthGuard() {
  const { isInitialized, session, setSession, setInitialized } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // Check Supabase session only; local-only users are not considered authenticated.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
      }
      setInitialized(true);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearDatabase();
      } else if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        runFullSync().catch(console.error);
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.grn} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/welcome" />;
  }
}
