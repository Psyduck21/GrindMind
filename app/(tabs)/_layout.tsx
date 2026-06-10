import { Tabs } from 'expo-router';
import { COLORS } from '../../src/constants/theme';
import { Text } from 'react-native';

const TAB_ICONS: Record<string, string> = {
  index: '🏠',
  routine: '📋',
  review: '📊',
  settings: '👤',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.txt,
        tabBarInactiveTintColor: COLORS.txt3,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.4 }}>
            {TAB_ICONS[route.name] ?? '●'}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home' }} />
      <Tabs.Screen name="routine"  options={{ title: 'Routine' }} />
      <Tabs.Screen name="review"   options={{ title: 'Review' }} />
      <Tabs.Screen name="settings" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
