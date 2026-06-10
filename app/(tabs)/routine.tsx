import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../src/constants/theme';
import { useUser, useActiveRoutine, useTasks, useHabits } from '../../src/hooks/useQueries';
import { Button } from '../../src/components/ui/Button';

export default function RoutineScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: routine } = useActiveRoutine(user?.id);
  const { data: tasks } = useTasks(routine?.id);
  const { data: habits } = useHabits(routine?.id);

  const handleRebuild = () => {
    Alert.alert(
      'Rebuild Routine',
      'This will archive your current routine and walk you through generating a new one. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Rebuild', 
          style: 'destructive',
          onPress: () => {
            // Rebuilding implies re-doing the onboarding AI generation
            router.push('/(auth)/onboarding');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Routine</Text>
            {routine && <Text style={styles.subtitle}>Target: {routine.target_goal}</Text>}
          </View>
          <Button 
            title="Rebuild" 
            onPress={handleRebuild} 
            variant="outline-dark" 
            style={styles.rebuildBtn}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHead}>Daily Tasks ({tasks?.length || 0})</Text>
          {tasks?.map((t: any) => (
            <View key={t.id} style={styles.itemCard}>
              <View style={[styles.priorityBadge, { borderColor: getPriorityColor(t.priority) }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(t.priority) }]}>{t.priority.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.itemTitle}>{t.title}</Text>
                {t.scheduled_time && <Text style={styles.itemMeta}>🕐 {t.scheduled_time} • ⏱ {t.estimated_duration_minutes}m</Text>}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHead}>Habits ({habits?.length || 0})</Text>
          {habits?.map((h: any) => (
            <View key={h.id} style={styles.itemCard}>
              <Text style={{ fontSize: 16 }}>🔄</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.itemTitle}>{h.title}</Text>
                <Text style={styles.itemMeta}>{h.recurrence_rule}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const getPriorityColor = (p: string) => {
  switch (p) {
    case 'critical': return COLORS.danger;
    case 'high': return COLORS.txt;
    case 'medium': return COLORS.txt2;
    default: return COLORS.txt3;
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { ...TYPOGRAPHY.display, fontSize: 28 },
  subtitle: { ...TYPOGRAPHY.small, color: COLORS.txt2, marginTop: 4 },
  rebuildBtn: { borderColor: COLORS.danger },

  section: { marginBottom: 24 },
  sectionHead: { ...TYPOGRAPHY.small, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, color: COLORS.txt2 },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemTitle: { ...TYPOGRAPHY.bodyBold, marginBottom: 2 },
  itemMeta: { ...TYPOGRAPHY.small, color: COLORS.txt3 },
  priorityBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  priorityText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
});
