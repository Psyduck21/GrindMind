import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Svg, { Circle, Path } from 'react-native-svg';

export interface Subtask {
  id: string;
  title: string;
  is_completed: number;
}

export interface TaskItem {
  id: string;
  title: string;
  scheduled_time: string;
  estimated_duration_minutes: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not_started' | 'completed' | 'missed' | 'skipped';
  is_recovery_task: number;
  subtasks?: Subtask[];
}

interface TaskRowProps {
  task: TaskItem;
  onPress: () => void;
  onToggleSubtask?: (subtaskId: string) => void;
}

export function TaskRow({ task, onPress, onToggleSubtask }: TaskRowProps) {
  const isCritical = task.priority === 'high' || task.priority === 'critical';
  const isRecovery = task.is_recovery_task === 1;
  const isDone = task.status === 'completed';

  const renderTimelineIcon = () => {
    if (isDone) {
      return (
        <View style={[styles.iconContainer, { backgroundColor: COLORS.txt }]}>
          <Svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <Path d="M20 6L9 17L4 12" stroke={COLORS.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </View>
      );
    }
    return (
      <View style={[styles.iconContainer, { backgroundColor: COLORS.lightMint, borderWidth: 2, borderColor: isCritical ? COLORS.warning : COLORS.txt }]}>
        <View style={[styles.innerDot, { backgroundColor: isCritical ? COLORS.warning : COLORS.txt }]} />
      </View>
    );
  };

  const getPill = () => {
    if (isDone) return null; // Icon handles it
    if (isCritical) return <View style={[styles.pill, { backgroundColor: 'rgba(255, 165, 2, 0.1)' }]}><Text style={[styles.pillText, { color: COLORS.warning }]}>CRITICAL</Text></View>;
    if (isRecovery) return <View style={[styles.pill, { backgroundColor: COLORS.lightMint }]}><Text style={[styles.pillText, { color: COLORS.txt }]}>RECOVERY</Text></View>;
    return null;
  };

  return (
    <View style={styles.timelineWrapper}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.card,
          isDone && styles.cardDone,
        ]}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
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
                {task.estimated_duration_minutes} min
              </Text>
            </View>

            <View style={styles.rightSection}>
              {getPill()}
              <Text style={styles.scheduledTime}>{task.scheduled_time}</Text>
            </View>
          </View>

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <View style={styles.subtasksContainer}>
              {task.subtasks.map((subtask) => (
                <TouchableOpacity 
                  key={subtask.id} 
                  style={styles.subtaskRow}
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation(); // prevent clicking the card
                    onToggleSubtask?.(subtask.id);
                  }}
                >
                  <View style={[styles.subtaskCheckbox, subtask.is_completed === 1 && styles.subtaskCheckboxDone]}>
                    {subtask.is_completed === 1 && (
                      <Svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <Path d="M20 6L9 17L4 12" stroke={COLORS.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </Svg>
                    )}
                  </View>
                  <Text style={[styles.subtaskTitle, subtask.is_completed === 1 && styles.subtaskTitleDone]}>
                    {subtask.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  railContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.border,
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    zIndex: 2,
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
    ...SHADOWS.floating,
  },
  cardDone: {
    backgroundColor: COLORS.bg, // Recedes into background
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: 4,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.txt2,
  },
  titleRecovery: {
    color: COLORS.darkEmerald,
  },
  time: {
    ...TYPOGRAPHY.small,
    color: COLORS.txt2,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  scheduledTime: {
    ...TYPOGRAPHY.h2,
    fontSize: 14,
    color: COLORS.txt,
    marginTop: 4,
  },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: {
    ...TYPOGRAPHY.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtasksContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border2,
    gap: 8,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  subtaskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  subtaskCheckboxDone: {
    backgroundColor: COLORS.txt,
    borderColor: COLORS.txt,
  },
  subtaskTitle: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.txt2,
    flex: 1,
    lineHeight: 20,
  },
  subtaskTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.txt2,
  },
});
