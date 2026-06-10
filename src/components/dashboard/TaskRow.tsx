import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';

export interface TaskItem {
  id: string;
  title: string;
  scheduled_time: string;
  estimated_duration_minutes: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not_started' | 'completed' | 'missed' | 'skipped';
  is_recovery_task: number;
}

interface TaskRowProps {
  task: TaskItem;
  onPress: () => void;
}

export function TaskRow({ task, onPress }: TaskRowProps) {
  const isCritical = task.priority === 'high';
  const isRecovery = task.is_recovery_task === 1;
  const isDone = task.status === 'completed';

  const getLeftBorderStyle = () => {
    if (isCritical) return { borderLeftWidth: 3, borderLeftColor: COLORS.txt };
    if (isRecovery) return { borderLeftWidth: 3, borderLeftColor: COLORS.grn };
    return {};
  };

  const getDotStyle = () => {
    if (isCritical) return { backgroundColor: COLORS.txt };
    if (isRecovery) return { backgroundColor: COLORS.grn };
    if (isDone) return { backgroundColor: COLORS.txt3 };
    return { backgroundColor: COLORS.border2 };
  };

  const getPill = () => {
    if (isDone) return <View style={[styles.pill, styles.pillGreen]}><Text style={styles.pillTextGreen}>✓</Text></View>;
    if (isCritical) return <View style={[styles.pill, styles.pillDark]}><Text style={styles.pillTextDark}>CRITICAL</Text></View>;
    if (isRecovery) return <View style={[styles.pill, styles.pillGreen]}><Text style={styles.pillTextGreen}>MAKE UP</Text></View>;
    return null;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        getLeftBorderStyle(),
        isDone && styles.containerDone,
      ]}
    >
      <View style={[styles.dot, getDotStyle()]} />
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            isDone && styles.titleDone,
            isRecovery && !isDone && styles.titleRecovery,
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <Text style={styles.time}>
          {task.scheduled_time} • {task.estimated_duration_minutes} min
        </Text>
      </View>
      {getPill()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  containerDone: {
    opacity: 0.5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: 2,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.txt3,
  },
  titleRecovery: {
    color: COLORS.grnHi,
  },
  time: {
    ...TYPOGRAPHY.small,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillDark: {
    backgroundColor: COLORS.white10,
    borderColor: COLORS.border2,
  },
  pillTextDark: {
    ...TYPOGRAPHY.small,
    fontSize: 8,
    letterSpacing: 0.5,
    fontWeight: '700',
    color: COLORS.txt,
  },
  pillGreen: {
    backgroundColor: COLORS.grnPill,
    borderColor: COLORS.grnBdr,
  },
  pillTextGreen: {
    ...TYPOGRAPHY.small,
    fontSize: 8,
    letterSpacing: 0.5,
    fontWeight: '700',
    color: COLORS.grnHi,
  },
});
