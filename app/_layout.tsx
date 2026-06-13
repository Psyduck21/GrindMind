import { useEffect, useState } from 'react';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupDatabase } from '../src/db/schema';
import { initDb, db } from '../src/db/db';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { COLORS } from '../src/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { scheduleDailyNotifications, requestNotificationPermissions } from '../src/services/notification/notificationScheduler';

import NetInfo from '@react-native-community/netinfo';
import { runFullSync } from '../src/services/sync/syncEngine';

const queryClient = new QueryClient();

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card: COLORS.s1,
    text: COLORS.txt,
    border: COLORS.border,
  },
};

export default function RootLayout() {
  const [dbInitialized, setDbInitialized] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    const boot = async () => {
      initDb();
      setupDatabase();

      // Schedule daily notifications if user exists
      try {
        const user = db.getFirstSync<any>('SELECT * FROM users LIMIT 1');
        if (user) {
          await requestNotificationPermissions();
          await scheduleDailyNotifications({
            userId: user.id,
            accountabilityMode: user.accountability_mode || 'coach',
            wakeTime: user.wake_time || '06:00',
            sleepTime: user.sleep_time || '23:00',
          });
        }
      } catch {
        // Non-critical — app works without notifications
      }

      setDbInitialized(true);
      
      // Initial sync
      runFullSync().catch(console.error);
    };

    boot();
  }, []);

  // Listen for network connectivity to flush offline queue and pull updates
  useEffect(() => {
    if (!dbInitialized) return;

    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        runFullSync().catch(console.error);
      }
    });

    return () => unsubscribe();
  }, [dbInitialized]);

  if (!dbInitialized || !fontsLoaded) {
    return null; // Or a splash screen component
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={AppTheme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="task/[id]"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="settings"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
