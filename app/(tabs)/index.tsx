import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Flame, BarChart2 } from 'lucide-react-native';
import { useUser, useAllActiveRoutines, useAllTasksForToday, useHabits } from '../../src/hooks/useQueries';
import { CircularProgress } from '../../src/components/ui/CircularProgress';
import { TaskRow } from '../../src/components/dashboard/TaskRow';
import Animated, { FadeInUp, Easing, useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { HabitTracker } from '../../src/components/dashboard/HabitTracker';
import { GradientHeroCard } from '../../src/components/ui/GradientHeroCard';
import { COLORS, TYPOGRAPHY } from '../../src/constants/theme';
import { calculateStreak } from '../../src/services/scoring/streakCalculator';
import { calculatePromiseKeptRate } from '../../src/services/scoring/scoreEngine';

import { useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/db/db';

const { width } = Dimensions.get('window');
const TASK_CARD_WIDTH = width * 0.85;

function AnimatedTaskCard({ task, index, scrollX, onTaskPress, onToggleSubtask }: any) {
  const ITEM_SIZE = TASK_CARD_WIDTH + 16;
  const animatedStyle = useAnimatedStyle(() => {
    const diff = scrollX.value - (index * ITEM_SIZE);
    // Lower opacity and scale when the card is not active (diff != 0)
    const opacity = interpolate(diff, [-ITEM_SIZE, 0, ITEM_SIZE], [0.4, 1, 0.4], Extrapolation.CLAMP);
    const scale = interpolate(diff, [-ITEM_SIZE, 0, ITEM_SIZE], [0.92, 1, 0.92], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 100).easing(Easing.inOut(Easing.ease)).duration(400)}
      style={[styles.taskWrapper, { width: TASK_CARD_WIDTH }, animatedStyle]}
    >
      <Text style={styles.taskRoutineTag}>{task.routine_type} {task.routine_title}</Text>
      <TaskRow
        task={task}
        onPress={onTaskPress}
        onToggleSubtask={onToggleSubtask}
      />
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: routines, isLoading: routinesLoading } = useAllActiveRoutines(user?.id);
  const { data: tasks, isLoading: tasksLoading } = useAllTasksForToday(user?.id);

  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // We'll just fetch habits for the first routine for now on the dashboard, or we could fetch all.
  const firstRoutineId = routines && routines.length > 0 ? routines[0].id : undefined;
  const { data: habits } = useHabits(firstRoutineId);

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t: any) => t.status === 'completed').length || 0;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const progressPercent = Math.round(progress * 100);

  const streak = useMemo(() => user?.id ? calculateStreak(user.id) : 0, [user?.id, completedTasks]);
  const promiseKept = useMemo(() => user?.id ? calculatePromiseKeptRate(user.id) : 0, [user?.id, completedTasks]);

  if (userLoading || routinesLoading || tasksLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.txt} />
      </View>
    );
  }

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{todayStr}</Text>
            <Text style={styles.title}>Good day, {user?.name?.split(' ')[0] || 'Grinder'}!</Text>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <GradientHeroCard
            title="Today's Combined Progress"
            subtitle={`${completedTasks} of ${totalTasks} Tasks Completed`}
          >
            <CircularProgress
              progress={progress}
              size={100}
              strokeWidth={10}
              label={`${progressPercent}%`}
              color={COLORS.white}
              trackColor="rgba(255,255,255,0.2)"
            />
          </GradientHeroCard>
        </View>

        {/* Stats Pills */}
        <View style={styles.statsPills}>
          <View style={styles.pill}>
            <Flame color={COLORS.warning} size={16} />
            <Text style={styles.pillText}>{streak} day streak</Text>
          </View>
          <View style={styles.pill}>
            <BarChart2 color={COLORS.primary} size={16} />
            <Text style={styles.pillText}>{promiseKept}% kept</Text>
          </View>
        </View>
        {/* Tasks List */}
        <View style={styles.taskList}>
          <Text style={styles.sectionHead}>Today's Agenda</Text>

          {(!tasks || tasks.length === 0) ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tasks for today across any routines. You're off the hook.</Text>
            </View>
          ) : (
            <View style={{ marginHorizontal: -24 }}>
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={TASK_CARD_WIDTH + 16}
                decelerationRate="normal"
                disableIntervalMomentum={true}
                snapToAlignment="center"
                contentContainerStyle={{ paddingHorizontal: 24, gap: 16, paddingBottom: 16 }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
              >
                {tasks.map((task: any, index: number) => (
                  <AnimatedTaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    scrollX={scrollX}
                    onTaskPress={() => router.push(`/task/${task.id}`)}
                    onToggleSubtask={(subtaskId: string) => {
                      const subtask = task.subtasks.find((s: any) => s.id === subtaskId);
                      if (subtask) {
                        const newValue = subtask.is_completed === 1 ? 0 : 1;
                        db.runSync('UPDATE subtasks SET is_completed = ? WHERE id = ?', [newValue, subtaskId]);
                        queryClient.invalidateQueries({ queryKey: ['tasks', 'all', 'today', user?.id] });
                      }
                    }}
                  />
                ))}
              </Animated.ScrollView>
            </View>
          )}
        </View>

        {/* Habits Section */}
        {habits && habits.length > 0 && (
          <View style={[styles.taskList, { marginTop: 16 }]}>
            <Text style={styles.sectionHead}>Daily Habits</Text>
            <HabitTracker habits={habits} routineId={firstRoutineId || ''} />
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
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  date: {
    ...TYPOGRAPHY.small,
    color: COLORS.txt2,
    marginBottom: 4,
  },
  title: {
    ...TYPOGRAPHY.h1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.txt,
  },
  heroSection: {
    marginBottom: 24,
  },
  statsPills: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: COLORS.txt,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  pillText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.txt,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHead: {
    ...TYPOGRAPHY.h2,
    marginBottom: 16,
  },
  routineScroll: {
    paddingRight: 24, // allow scroll past edge
    gap: 16,
  },
  routineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    width: 220,
    shadowColor: COLORS.txt,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  routineTag: {
    fontSize: 24,
    marginBottom: 12,
  },
  routineCardTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: 4,
  },
  routineCardSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.txt2,
  },
  routineCardEmpty: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    width: 220,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineCardEmptyText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.txt2,
  },
  routineCardAdd: {
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    width: 60,
    borderWidth: 2,
    borderColor: COLORS.border2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineCardAddText: {
    fontSize: 24,
    color: COLORS.txt2,
  },
  taskList: {
    flex: 1,
  },
  taskWrapper: {
    marginBottom: 0,
  },
  taskRoutineTag: {
    ...TYPOGRAPHY.caption,
    color: COLORS.txt,
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: '700',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt2,
    textAlign: 'center',
  },
});
