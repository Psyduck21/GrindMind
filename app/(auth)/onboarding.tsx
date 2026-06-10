import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../../src/stores/useOnboardingStore';
import { onboardingSchema } from '../../src/utils/validation';
import { COLORS, TYPOGRAPHY } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { supabase } from '../../src/supabase/client';
import { db } from '../../src/db/db';
import { generateRoutine } from '../../src/services/ai/gemini';
import { generateRoutineInteractive } from '../../src/services/ai/interactive';
import { saveGeneratedRoutine } from '../../src/db/repositories/routine';
import { useQueryClient } from '@tanstack/react-query';
import uuid from 'react-native-uuid';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const { data, updateData } = useOnboardingStore();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleNext = () => {
    if (step === 1 && !data.name) {
      Alert.alert('Required', 'Please enter your name');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      finalizeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const finalizeOnboarding = async () => {
    setLoading(true);
    try {
      const validData = onboardingSchema.parse(data);

      // Ensure the user is signed in via Supabase before creating a local profile.
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session ?? null;
      if (!session) {
        Alert.alert('Sign-in required', 'Please sign in with Google before continuing.');
        router.replace('/(auth)/welcome');
        return;
      }

      const newUserId = session.user.id;

      db.runSync(
        `INSERT INTO users (id, name, primary_goal, available_daily_minutes, wake_time, sleep_time, accountability_mode, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          validData.name,
          validData.grindType,
          validData.dailyMinutes,
          validData.wakeTime,
          validData.sleepTime,
          validData.accountabilityMode,
          Date.now(),
          Date.now(),
        ]
      );
      
      // Call Gemini API to generate the routine (interactive)
      const store = useOnboardingStore.getState();
      const generatedOrQuestion = await generateRoutineInteractive(validData, store.aiAnswers);

      if ((generatedOrQuestion as any).needs_input) {
        // Store question and navigate to AI question screen
        const q = (generatedOrQuestion as any).question as string;
        useOnboardingStore.getState().setAIQuestion?.(q);
        router.push('/(auth)/ai-question');
        return;
      }

      const generated = (generatedOrQuestion as any).routine;

      // Save routine and tasks to SQLite
      const routineId = saveGeneratedRoutine(newUserId, generated);

      // Invalidate queries so UI picks up the new routine immediately
      queryClient.invalidateQueries({ queryKey: ['routine', newUserId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', routineId] });
      queryClient.invalidateQueries({ queryKey: ['habits', routineId] });

      router.replace('/(tabs)');
      
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const renderProgress = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{step} of 3</Text>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>What are you chasing?</Text>
      <Text style={styles.subtitle}>Choose your grind type</Text>

      <Input
        label="Your Name"
        placeholder="e.g. David"
        value={data.name || ''}
        onChangeText={(text) => updateData({ name: text })}
        autoCapitalize="words"
      />

      <View style={styles.grid}>
        {[
          { id: 'study', icon: '📚', label: 'Study Grind' },
          { id: 'fitness', icon: '💪', label: 'Fitness Grind' },
          { id: 'career', icon: '💼', label: 'Career Grind' },
          { id: 'custom', icon: '⚡', label: 'Custom' },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, data.grindType === item.id && styles.cardSelected]}
            onPress={() => updateData({ grindType: item.id as any })}
          >
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <Text style={[styles.cardLabel, data.grindType === item.id && styles.cardLabelSelected]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Time Setup</Text>
      <Text style={styles.subtitle}>When do you operate?</Text>
      
      <Input
        label="Wake up time (HH:MM)"
        placeholder="06:00"
        value={data.wakeTime}
        onChangeText={(text) => updateData({ wakeTime: text })}
      />
      <Input
        label="Sleep time (HH:MM)"
        placeholder="23:00"
        value={data.sleepTime}
        onChangeText={(text) => updateData({ sleepTime: text })}
      />
      <Input
        label="Daily commitment (minutes)"
        placeholder="90"
        keyboardType="numeric"
        value={data.dailyMinutes?.toString() || ''}
        onChangeText={(text) => updateData({ dailyMinutes: parseInt(text) || 0 })}
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Mode Select</Text>
      <Text style={styles.subtitle}>Sets your coaching tone</Text>
      
      {[
        { id: 'friendly', icon: '😊', name: 'Friendly', desc: `"I'll be gentle with you"` },
        { id: 'coach', icon: '💪', name: 'Coach', desc: `"Firm but fair"` },
        { id: 'military', icon: '🎖️', name: 'Military', desc: `"No mercy, no excuses"` },
        { id: 'savage', icon: '🔥', name: 'Savage', desc: `"You asked for this"` },
        { id: 'iron_discipline', icon: '☠️', name: 'Iron Discipline', desc: `"Not for the weak"` },
      ].map((mode) => (
        <TouchableOpacity
          key={mode.id}
          style={[styles.modeCard, data.accountabilityMode === mode.id && styles.modeCardSelected]}
          onPress={() => updateData({ accountabilityMode: mode.id as any })}
        >
          <Text style={{ fontSize: 24, marginRight: 16 }}>{mode.icon}</Text>
          <View>
            <Text style={[styles.modeName, data.accountabilityMode === mode.id && styles.modeNameSelected]}>
              {mode.name}
            </Text>
            <Text style={styles.modeDesc}>{mode.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderProgress()}
      
      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <Button title="Back" variant="outline-dark" onPress={handleBack} style={{ flex: 1 }} />
        )}
        <Button 
          title={step === 3 ? "Complete" : "Next"} 
          onPress={handleNext} 
          style={{ flex: 2, marginLeft: step > 1 ? 8 : 0 }} 
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.s3,
    borderRadius: 2,
    marginRight: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.txt,
  },
  progressText: {
    ...TYPOGRAPHY.small,
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
    fontSize: 24,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cardSelected: {
    backgroundColor: COLORS.s2,
    borderColor: COLORS.txt,
  },
  cardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  cardLabel: {
    ...TYPOGRAPHY.small,
    fontWeight: '700',
  },
  cardLabelSelected: {
    color: COLORS.txt,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  modeCardSelected: {
    backgroundColor: COLORS.txt,
    borderColor: COLORS.txt,
  },
  modeName: {
    ...TYPOGRAPHY.bodyBold,
  },
  modeNameSelected: {
    color: COLORS.bg,
  },
  modeDesc: {
    ...TYPOGRAPHY.small,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.s2,
  },
});
