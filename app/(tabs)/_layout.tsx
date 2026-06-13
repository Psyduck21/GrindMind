import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS } from '../../src/constants/theme';
import { CustomTabBar } from '../../src/components/ui/CustomTabBar';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Tabs
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index"    options={{ title: 'Home' }} />
        <Tabs.Screen name="routine"  options={{ title: 'Routine' }} />
        <Tabs.Screen name="review"   options={{ title: 'Review' }} />
        <Tabs.Screen name="settings" options={{ title: 'Profile' }} />
      </Tabs>
    </View>
  );
}
