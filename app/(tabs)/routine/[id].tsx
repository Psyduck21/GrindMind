import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../../src/constants/theme';
import { useRoutine, useTasks, useHabits, useRoutineWeeks } from '../../../src/hooks/useQueries';
import { FloatingCard } from '../../../src/components/ui/FloatingCard';
import { ChevronDown, ChevronRight, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { db } from '../../../src/db/db';

export default function RoutineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const routineId = typeof id === 'string' ? id : undefined;

  const { data: routine, isLoading: routineLoading } = useRoutine(routineId);
  const { data: tasks, isLoading: tasksLoading } = useTasks(routineId);
  const { data: habits } = useHabits(routineId);
  const { data: completedWeeks } = useRoutineWeeks(routineId);

  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1]);

  const toggleWeek = (week: number) => {
    setExpandedWeeks(prev => 
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
  };

  // Dynamically determine day order from the tasks insertion order in SQLite
  const dayOrder = useMemo(() => {
    if (!routineId) return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    try {
      const rows = db.getAllSync<{ target_day: string }>(
        'SELECT DISTINCT target_day FROM tasks WHERE routine_id = ? ORDER BY rowid ASC',
        [routineId]
      );
      const orderedDays = rows.map(r => r.target_day).filter(Boolean);
      const standardDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const missingDays = standardDays.filter(d => !orderedDays.includes(d));
      return [...orderedDays, ...missingDays];
    } catch (e) {
      console.error('Error getting day order:', e);
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    }
  }, [routineId, tasks]);

  const groupedTasks = useMemo(() => {
    if (!tasks) return {};
    const groups: Record<number, Record<string, any[]>> = {};
    tasks.forEach(t => {
      const w = t.target_week || 1;
      const d = t.target_day || dayOrder[0] || 'Monday';
      if (!groups[w]) groups[w] = {};
      if (!groups[w][d]) groups[w][d] = [];
      groups[w][d].push(t);
    });
    return groups;
  }, [tasks, dayOrder]);

  if (routineLoading || tasksLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.txt} />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.loading}>
        <Text style={styles.sectionHead}>Routine not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{marginTop: 16}}><Text style={{color: COLORS.txt}}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={COLORS.txt} size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.title}>{routine.title}</Text>
            <Text style={styles.subtitle}>{routine.goal}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHead}>Implementation Plan</Text>
          
          {Object.keys(groupedTasks).map(weekStr => {
            const week = parseInt(weekStr, 10);
            const isExpanded = expandedWeeks.includes(week);
            const isCompleted = completedWeeks?.some((cw: any) => cw.week_number === week);

            return (
              <View key={week} style={styles.weekContainer}>
                <TouchableOpacity 
                  style={[styles.weekHeader, isExpanded && styles.weekHeaderExpanded]} 
                  onPress={() => toggleWeek(week)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.weekTitle}>Week {week}</Text>
                    {isCompleted && <CheckCircle color={COLORS.txt} size={20} />}
                  </View>
                  {isExpanded ? <ChevronDown color={COLORS.txt} size={20} /> : <ChevronRight color={COLORS.txt} size={20} />}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.daysContainer}>
                    {dayOrder.map(day => {
                      const dayTasks = groupedTasks[week][day];
                      if (!dayTasks || dayTasks.length === 0) return null;

                      return (
                        <View key={day} style={styles.dayContainer}>
                          <Text style={styles.dayTitle}>{day}</Text>
                          {dayTasks.map((t: any) => (
                            <FloatingCard key={t.id} style={styles.itemCard}>
                              <View style={[styles.priorityBadge, { borderColor: getPriorityColor(t.priority), backgroundColor: getPriorityBgColor(t.priority) }]}>
                                <Text style={[styles.priorityText, { color: getPriorityColor(t.priority) }]}>{t.priority.toUpperCase()}</Text>
                              </View>
                              <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={styles.itemTitle}>{t.title}</Text>
                                <Text style={styles.itemMeta}>⏱ {t.estimated_duration_minutes} min</Text>
                              </View>
                            </FloatingCard>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {habits && habits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHead}>Habits</Text>
            {habits.map((h: any) => (
              <FloatingCard key={h.id} style={styles.itemCard}>
                <View style={styles.habitIcon}>
                  <Text style={{ fontSize: 18 }}>🔄</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.itemTitle}>{h.title}</Text>
                  <Text style={styles.itemMeta}>{h.recurrence_rule}</Text>
                </View>
              </FloatingCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getPriorityColor = (p: string) => {
  switch (p) {
    case 'critical': return COLORS.warning;
    case 'high': return COLORS.txt;
    case 'medium': return COLORS.txt2;
    default: return COLORS.txt2;
  }
};

const getPriorityBgColor = (p: string) => {
  switch (p) {
    case 'critical': return 'rgba(255, 165, 2, 0.1)';
    case 'high': return COLORS.lightMint;
    case 'medium': return COLORS.bg;
    default: return COLORS.bg;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  scroll: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 28,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt2,
    marginTop: 4,
  },
  rebuildBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionHead: {
    ...TYPOGRAPHY.h2,
    marginBottom: 16,
  },
  weekContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  weekHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border2,
    backgroundColor: COLORS.bg,
  },
  weekTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 16,
    color: COLORS.txt,
  },
  daysContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  dayContainer: {
    marginBottom: 16,
  },
  dayTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.txt,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
  },
  habitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: 2,
  },
  itemMeta: {
    ...TYPOGRAPHY.small,
    color: COLORS.txt2,
  },
});
