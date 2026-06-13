import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { FloatingCard } from '../src/components/ui/FloatingCard';
import { saveGeneratedRoutine } from '../src/db/repositories/routine';
import { parseMarkdownRoutine } from '../src/services/routineParser';
import { supabase } from '../src/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS, TYPOGRAPHY } from '../src/constants/theme';
import { X } from 'lucide-react-native';

export default function ImportRoutineScreen() {
  const router = useRouter();
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const promptText = `I want you to act as an expert life coach and planner. I need a new 4-week routine.

First, ask me 3 clarifying questions to understand my specific needs (e.g., fitness, study, work). 
Once I answer, generate a complete 4-week implementation plan using the EXACT markdown format below. Do not deviate.

# [Routine Title]
Tag: [Category emoji, e.g. 🏋️ Fitness, 📚 Study, 💼 Work]
Goal: [Routine Goal]

## Week 1
### Monday
#### [Task Title]
- Priority: high
- Duration: 30
- Category: [Task Category]
- Description: [Task description]
- [ ] Subtask 1
- [ ] Subtask 2

(Repeat for each day and week up to Week 4)`;

  const handleSubmit = async () => {
    if (!markdown.trim()) {
      Alert.alert('Error', 'Please paste the generated markdown.');
      return;
    }
    
    setIsLoading(true);

    try {
      const generated = parseMarkdownRoutine(markdown);

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
      queryClient.invalidateQueries({ queryKey: ['routines', userId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', routineId] });
      queryClient.invalidateQueries({ queryKey: ['habits', routineId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all', 'today', userId] });

      setIsLoading(false);
      router.back();
    } catch (e: any) {
      setIsLoading(false);
      Alert.alert('Parsing Error', e.message || 'Failed to parse the markdown. Check the format.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>Add Routine</Text>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                <X color={COLORS.txt2} size={24} />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>Use an external AI to generate your plan and paste it below.</Text>
          </View>

          <FloatingCard style={styles.card}>
            <Text style={styles.cardTitle}>Step 1: Copy Prompt</Text>
            <Text style={styles.cardText}>Highlight and copy this prompt, then paste it into your favorite AI.</Text>
            <View style={styles.copyBox}>
              <Text style={styles.copyText} selectable={true}>
                {promptText}
              </Text>
            </View>
          </FloatingCard>

          <FloatingCard style={styles.card}>
            <Text style={styles.cardTitle}>Step 2: Paste Result</Text>
            <Text style={styles.cardText}>After the AI generates the Markdown plan, paste it here.</Text>
            <Input
              value={markdown}
              onChangeText={setMarkdown}
              placeholder="# My Routine\nTag: 🏋️ Fitness\nGoal: Crush it\n\n## Week 1\n### Monday..."
              multiline
              style={styles.input}
            />
          </FloatingCard>
        </ScrollView>

        <View style={styles.footer}>
          <Button 
            title={isLoading ? "Importing..." : "Add Routine"} 
            onPress={handleSubmit} 
            disabled={isLoading || !markdown.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  keyboardView: { flex: 1, justifyContent: 'space-between' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
  },
  headerTitle: {
    ...TYPOGRAPHY.display,
    fontSize: 32,
    color: COLORS.txt,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt2,
    marginTop: 8,
    lineHeight: 22,
  },
  card: {
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.txt,
    marginBottom: 8,
  },
  cardText: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt2,
    marginBottom: 16,
  },
  copyBox: {
    backgroundColor: COLORS.bg,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
    position: 'relative',
  },
  copyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.txt2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  input: { 
    minHeight: 200,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footer: {
    padding: 24,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border2,
  }
});
