import re

content = """import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Flame, BarChart2, Calendar as CalendarIcon, Clock } from 'lucide-react-native';
import { useUser, useAllActiveRoutines, useAgendaTasks, useHabits } from '../../src/hooks/useQueries';
import { CircularProgress } from '../../src/components/ui/CircularProgress';
import { TaskRow } from '../../src/components/dashboard/TaskRow';
import { HabitTracker } from '../../src/components/dashboard/HabitTracker';
import { GradientHeroCard } from '../../src/components/ui/GradientHeroCard';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/constants/theme';
import { calculateStreak } from '../../src/services/scoring/streakCalculator';
import { calculatePromiseKeptRate } from '../../src/services/scoring/scoreEngine';
import { Agenda } from 'react-native-calendars';
import { getLocalYYYYMMDD } from '../../src/utils/date';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/db/db';
import { queueOperation } from '../../src/services/sync/syncEngine';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: routines, isLoading: routinesLoading } = useAllActiveRoutines(user?.id);
  const { data: agendaItems, isLoading: tasksLoading } = useAgendaTasks(user?.id);

  // We'll just fetch habits for the first routine for now on the dashboard
  const firstRoutineId = routines && routines.length > 0 ? routines[0].id : undefined;
  const { data: habits } = useHabits(firstRoutineId);

  const [selectedDate, setSelectedDate] = useState(getLocalYYYYMMDD(new Date()));
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedTaskForReschedule, setSelectedTaskForReschedule] = useState<any>(null);

  // Flatten tasks for progress calculation
  const allTasks = useMemo(() => {
    if (!agendaItems) return [];
    return Object.values(agendaItems).flat();
  }, [agendaItems]);

  const todaysTasks = agendaItems ? agendaItems[getLocalYYYYMMDD(new Date())] || [] : [];
  const totalTasks = todaysTasks.length;
  const completedTasks = todaysTasks.filter((t: any) => t.status === 'completed').length;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const progressPercent = Math.round(progress * 100);

  const streak = useMemo(() => user?.id ? calculateStreak(user.id) : 0, [user?.id, completedTasks]);
  const promiseKept = useMemo(() => user?.id ? calculatePromiseKeptRate(user.id) : 0, [user?.id, completedTasks]);

  const handleTaskLongPress = (task: any) => {
    setSelectedTaskForReschedule(task);
    setRescheduleModalVisible(true);
  };

  const executeReschedule = async (newDate: string | null, isBacklog: number) => {
    if (!selectedTaskForReschedule) return;
    try {
      await db.runAsync(
        'UPDATE tasks SET scheduled_date = ?, is_backlog = ?, updated_at = ? WHERE id = ?',
        [newDate, isBacklog, Date.now(), selectedTaskForReschedule.id]
      );
      
      const updatedTask = await db.getFirstAsync<any>('SELECT * FROM tasks WHERE id = ?', [selectedTaskForReschedule.id]);
      if (updatedTask) {
         await queueOperation('tasks', 'UPDATE', updatedTask);
      }
      queryClient.invalidateQueries({ queryKey: ['tasks', 'agenda'] });
    } catch (e) {
      console.error('Reschedule failed', e);
    } finally {
      setRescheduleModalVisible(false);
      setSelectedTaskForReschedule(null);
    }
  };

  if (userLoading || routinesLoading || tasksLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.txt} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          <Text style={styles.title}>Good day, {user?.name?.split(' ')[0] || 'Grinder'}!</Text>
        </View>
      </View>

      {/* Stats Pills */}
      <View style={styles.statsPills}>
        <View style={styles.pill}>
          <Flame color={COLORS.warning} size={16} />
          <Text style={styles.pillText}>{streak} day streak</Text>
        </View>
        <View style={styles.pill}>
          <BarChart2 color={COLORS.primary} size={16} />
          <Text style={styles.pillText}>{progressPercent}% today</Text>
        </View>
      </View>

      <Agenda
        items={agendaItems || {}}
        selected={selectedDate}
        onDayPress={(day: any) => setSelectedDate(day.dateString)}
        renderItem={(item: any, isFirst: boolean) => (
          <TouchableOpacity 
            style={styles.agendaItemContainer}
            onLongPress={() => handleTaskLongPress(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.agendaItemTime}>{item.start_time || 'Anytime'}</Text>
            <TaskRow
              task={item}
              onPress={() => router.push(`/task/${item.id}`)}
              onToggleSubtask={async (subtaskId: string) => {
                const subtask = item.subtasks.find((s: any) => s.id === subtaskId);
                if (subtask) {
                  const newValue = subtask.is_completed === 1 ? 0 : 1;
                  await db.runAsync('UPDATE subtasks SET is_completed = ? WHERE id = ?', [newValue, subtaskId]);
                  queryClient.invalidateQueries({ queryKey: ['tasks', 'agenda'] });
                }
              }}
            />
          </TouchableOpacity>
        )}
        renderEmptyDate={() => (
          <View style={styles.emptyDate}>
            <Text style={styles.emptyDateText}>No tasks scheduled.</Text>
          </View>
        )}
        theme={{
          backgroundColor: COLORS.bg,
          calendarBackground: COLORS.bg,
          textSectionTitleColor: COLORS.txt2,
          selectedDayBackgroundColor: COLORS.txt,
          selectedDayTextColor: COLORS.white,
          todayTextColor: COLORS.primary,
          dayTextColor: COLORS.txt,
          textDisabledColor: COLORS.border,
          dotColor: COLORS.primary,
          selectedDotColor: COLORS.white,
          arrowColor: COLORS.txt,
          monthTextColor: COLORS.txt,
          indicatorColor: COLORS.primary,
          agendaDayTextColor: COLORS.txt,
          agendaDayNumColor: COLORS.txt,
          agendaTodayColor: COLORS.primary,
          agendaKnobColor: COLORS.border2,
        }}
      />

      {/* Reschedule Modal Placeholder */}
      <Modal visible={rescheduleModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reschedule Task</Text>
            <Text style={styles.modalSubtitle}>{selectedTaskForReschedule?.title}</Text>
            
            <TouchableOpacity style={styles.modalBtn} onPress={() => {
              const tmrw = new Date();
              tmrw.setDate(tmrw.getDate() + 1);
              executeReschedule(getLocalYYYYMMDD(tmrw), 0);
            }}>
              <CalendarIcon color={COLORS.txt} size={20} />
              <Text style={styles.modalBtnText}>Move to Tomorrow</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtn} onPress={() => executeReschedule(null, 1)}>
              <Clock color={COLORS.txt} size={20} />
              <Text style={styles.modalBtnText}>Move to Backlog</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.bg }]} onPress={() => setRescheduleModalVisible(false)}>
              <Text style={styles.modalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
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
  statsPills: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...SHADOWS.floating,
  },
  pillText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.txt,
  },
  agendaItemContainer: {
    backgroundColor: COLORS.white,
    marginRight: 20,
    marginTop: 17,
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.floating,
  },
  agendaItemTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyDate: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border2,
  },
  emptyDateText: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt2,
    marginBottom: 24,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.s1,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  modalBtnText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.txt,
  },
});
"""

with open('app/(tabs)/index.tsx', 'w') as f:
    f.write(content)
