import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser, useActiveRoutine, useTasks, useHabits } from '../../src/hooks/useQueries';
import { CircularProgress } from '../../src/components/ui/CircularProgress';
import { TaskRow } from '../../src/components/dashboard/TaskRow';
import { HabitTracker } from '../../src/components/dashboard/HabitTracker';
import { COLORS, TYPOGRAPHY } from '../../src/constants/theme';
import { calculateStreak } from '../../src/services/scoring/streakCalculator';
import { calculatePromiseKeptRate } from '../../src/services/scoring/scoreEngine';

export default function DashboardScreen() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: routine, isLoading: routineLoading } = useActiveRoutine(user?.id);
  const { data: tasks, isLoading: tasksLoading } = useTasks(routine?.id);
  const { data: habits } = useHabits(routine?.id);

  if (userLoading || routineLoading || tasksLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.grn} />
      </View>
    );
  }

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t: any) => t.status === 'completed').length || 0;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const progressPercent = Math.round(progress * 100);

  const streak = useMemo(() => user?.id ? calculateStreak(user.id) : 0, [user?.id, completedTasks]);
  const promiseKept = useMemo(() => user?.id ? calculatePromiseKeptRate(user.id) : 0, [user?.id, completedTasks]);

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{todayStr}</Text>
            <Text style={styles.title}>Today's Grind</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
        </View>

        {/* Progress Circle */}
        <View style={styles.progressSection}>
          <CircularProgress 
            progress={progress} 
            label={`${progressPercent}%`}
            subLabel={`${completedTasks} of ${totalTasks}`}
          />
        </View>

        {/* Stats Pills */}
        <View style={styles.statsPills}>
          <View style={styles.pill}><Text style={styles.pillText}>🔥 {streak} day streak</Text></View>
          <View style={styles.pill}><Text style={styles.pillText}>📊 {promiseKept}% kept</Text></View>
          <View style={styles.pill}><Text style={styles.pillText}>✅ {progressPercent}% today</Text></View>
        </View>

        {/* Tasks List */}
        <View style={styles.taskList}>
          <Text style={styles.sectionHead}>Today's Grind</Text>
          
          {(!tasks || tasks.length === 0) ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tasks for today. You're off the hook.</Text>
            </View>
          ) : (
            tasks.map((task: any) => (
              <TaskRow 
                key={task.id} 
                task={task} 
                onPress={() => router.push(`/task/${task.id}`)} 
              />
            ))
          )}
        </View>

        {/* Habits Section */}
        {habits && habits.length > 0 && (
          <View style={styles.taskList}>
            <Text style={styles.sectionHead}>Daily Habits</Text>
            <HabitTracker habits={habits} routineId={routine?.id || ''} />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  date: {
    ...TYPOGRAPHY.small,
    color: COLORS.txt2,
    marginBottom: 2,
  },
  title: {
    ...TYPOGRAPHY.title,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.s3,
    borderWidth: 1,
    borderColor: COLORS.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.small,
    fontWeight: '700',
    color: COLORS.txt2,
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    backgroundColor: COLORS.s2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    ...TYPOGRAPHY.small,
    color: COLORS.txt2,
  },
  taskList: {
    flex: 1,
  },
  sectionHead: {
    ...TYPOGRAPHY.small,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: COLORS.s1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt3,
  },
});
