import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../../src/stores/useOnboardingStore';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { supabase } from '../../src/supabase/client';
import { db } from '../../src/db/db';

export default function OnboardingScreen() {
  const router = useRouter();
  const { data, updateData } = useOnboardingStore();
  const [loading, setLoading] = useState(false);

  const finalizeOnboarding = async () => {
    if (!data.name?.trim()) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session ?? null;
      if (!session) {
        Alert.alert('Sign-in required', 'Please sign in with Google before continuing.');
        router.replace('/(auth)/welcome');
        return;
      }

      const newUserId = session.user.id;

      // Fallback defaults for skipped setup steps
      const grindType = 'custom';
      const dailyMinutes = 90;
      const wakeTime = '06:00';
      const sleepTime = '23:00';
      const accountabilityMode = data.accountabilityMode || 'coach';

      db.runSync(
        `INSERT OR REPLACE INTO users (id, name, primary_goal, available_daily_minutes, wake_time, sleep_time, accountability_mode, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          data.name.trim(),
          grindType,
          dailyMinutes,
          wakeTime,
          sleepTime,
          accountabilityMode,
          Date.now(),
          Date.now(),
        ]
      );
      
      // Skip task generation and go straight to dashboard
      router.push('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Let's set up your profile</Text>

          <View style={{ marginBottom: 32 }}>
            <Input
              label="What should we call you?"
              placeholder="e.g. David"
              value={data.name || ''}
              onChangeText={(text) => updateData({ name: text })}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.title}>Mode Select</Text>
          <Text style={styles.subtitle}>Sets your coaching tone</Text>
          
          {[
            { id: 'friendly', icon: '😊', name: 'Friendly', desc: `"I'll be gentle with you"` },
            { id: 'coach', icon: '💪', name: 'Coach', desc: `"Firm but fair"` },
            { id: 'military', icon: '🎖️', name: 'Military', desc: `"No mercy, no excuses"` },
            { id: 'savage', icon: '🔥', name: 'Savage', desc: `"You asked for this"` },
            { id: 'iron_discipline', icon: '☠️', name: 'Iron Discipline', desc: `"Not for the weak"` },
          ].map((mode) => {
            const isSelected = data.accountabilityMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeCard, isSelected && styles.modeCardSelected]}
                onPress={() => updateData({ accountabilityMode: mode.id as any })}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 32, marginRight: 20 }}>{mode.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeName, isSelected && styles.modeNameSelected]}>
                    {mode.name}
                  </Text>
                  <Text style={[styles.modeDesc, isSelected && styles.modeDescSelected]}>{mode.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title="Complete Setup" 
          onPress={finalizeOnboarding} 
          style={{ flex: 1, backgroundColor: COLORS.txt }} 
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    padding: 24,
    flexGrow: 1,
  },
  stepContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.display,
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt2,
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    ...SHADOWS.floating,
  },
  modeCardSelected: {
    backgroundColor: COLORS.txt,
    borderColor: COLORS.darkEmerald,
    ...SHADOWS.active,
  },
  modeName: {
    ...TYPOGRAPHY.h2,
    marginBottom: 4,
  },
  modeNameSelected: {
    color: COLORS.white,
  },
  modeDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.txt2,
  },
  modeDescSelected: {
    color: COLORS.lightMint,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border2,
    backgroundColor: COLORS.white,
    ...SHADOWS.floating,
  },
});
