import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupDatabase } from '../src/db/schema';
import { initDb, db } from '../src/db/db';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { COLORS } from '../src/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { scheduleDailyNotifications, requestNotificationPermissions } from '../src/services/notification/notificationScheduler';

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
    };

    boot();
  }, []);

  if (!dbInitialized) {
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
