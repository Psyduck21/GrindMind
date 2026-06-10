import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { useOnboardingStore } from '../../src/stores/useOnboardingStore';
import { generateRoutineInteractive } from '../../src/services/ai/interactive';
import { saveGeneratedRoutine } from '../../src/db/repositories/routine';
import { supabase } from '../../src/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export default function AIQuestionScreen() {
  const router = useRouter();
  const store = useOnboardingStore();
  const question = store.aiQuestion || '';
  const [answer, setAnswer] = useState('');
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!question) return router.replace('/(tabs)');
    const accumulated = { ...(store.aiAnswers || {}), [question]: answer };
    // Optimistically store the answer
    store.addAIAnswer?.(question, answer);

    try {
      const result = await generateRoutineInteractive(store.data as any, accumulated);
      if ((result as any).needs_input) {
        // Model asks another question
        const q = (result as any).question as string;
        store.setAIQuestion?.(q);
        setAnswer('');
        return;
      }

      // Final routine received
      const generated = (result as any).routine;

      // Ensure we have a user id
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session ?? null;
      if (!session) {
        Alert.alert('Sign-in required', 'Please sign in again');
        router.replace('/(auth)/welcome');
        return;
      }
      const userId = session.user.id;

      const routineId = saveGeneratedRoutine(userId, generated);
      queryClient.invalidateQueries({ queryKey: ['routine', userId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', routineId] });
      queryClient.invalidateQueries({ queryKey: ['habits', routineId] });

      // Clear AI question/answers
      store.setAIQuestion?.(null);
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'AI generation failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.prompt}>{question}</Text>
        <TextInput
          style={styles.input}
          value={answer}
          onChangeText={setAnswer}
          placeholder="Your answer"
          multiline
        />
        <Button title="Submit" onPress={handleSubmit} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, flex: 1 },
  prompt: { fontSize: 18, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, minHeight: 80, marginBottom: 12 },
});
