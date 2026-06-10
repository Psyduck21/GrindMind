import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';
import { HabitItem, completeHabit, isHabitCompletedToday } from '../../db/repositories/habit';
import { useQueryClient } from '@tanstack/react-query';

interface HabitTrackerProps {
  habits: HabitItem[];
  routineId: string;
}

function HabitRow({ habit, onToggle }: { habit: HabitItem; onToggle: () => void }) {
  const done = isHabitCompletedToday(habit);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={done ? undefined : onToggle}
      style={[styles.row, done && styles.rowDone]}
    >
      <View style={[styles.check, done && styles.checkDone]}>
        {done && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, done && styles.titleDone]}>{habit.title}</Text>
        <Text style={styles.meta}>
          🔥 {habit.streak_count} streak · {habit.completion_count} total
        </Text>
      </View>
      {/* Longest streak badge */}
      {habit.longest_streak > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Best {habit.longest_streak}d</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function HabitTracker({ habits, routineId }: HabitTrackerProps) {
  const queryClient = useQueryClient();

  const handleToggle = (habitId: string) => {
    completeHabit(habitId);
    queryClient.invalidateQueries({ queryKey: ['habits', routineId] });
  };

  if (!habits || habits.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No habits tracked yet.</Text>
      </View>
    );
  }

  return (
    <View>
      {habits.map((h) => (
        <HabitRow key={h.id} habit={h} onToggle={() => handleToggle(h.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rowDone: {
    opacity: 0.55,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: COLORS.grn,
    borderColor: COLORS.grn,
  },
  checkMark: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: 2,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.txt3,
  },
  meta: {
    ...TYPOGRAPHY.small,
    color: COLORS.txt3,
  },
  badge: {
    backgroundColor: COLORS.grnPill,
    borderWidth: 1,
    borderColor: COLORS.grnBdr,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.grnHi,
    letterSpacing: 0.5,
  },
  empty: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.small,
    color: COLORS.txt3,
  },
});
