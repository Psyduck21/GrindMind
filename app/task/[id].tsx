import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/db/db';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { processTaskMiss } from '../../src/services/consequence/consequenceEngine';
import { getXpForTask } from '../../src/services/scoring/streakCalculator';
import { checkAndAwardBadges } from '../../src/services/gamification/badgeEngine';
import uuid from 'react-native-uuid';
import { getLocalYYYYMMDD } from '../../src/utils/date';
import { queueOperation } from '../../src/services/sync/syncEngine';

const SKIP_REASONS = [
  'No time',
  'Too tired',
  'Forgot',
  'Not feeling it',
  'External blocker',
  'Other',
];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => db.getFirstSync<any>('SELECT * FROM tasks WHERE id = ?', [id]),
    enabled: !!id,
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => db.getFirstSync<any>('SELECT * FROM users LIMIT 1'),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.txt} />;
  if (!task) return null;

  const isDone = task.status === 'completed';
  const isSkipped = task.status === 'skipped';
  const isCritical = task.priority === 'high' || task.priority === 'critical';

  const handleComplete = async () => {
    setLoading(true);
    try {
      const now = Date.now();
      const dateStr = getLocalYYYYMMDD();
      const xp = getXpForTask(task.priority, task.is_recovery_task === 1);

      // Optimistic updates
      queryClient.setQueryData(['tasks', task.routine_id], (old: any) => {
        if (!old) return old;
        return old.map((t: any) => t.id === task.id ? { ...t, status: 'completed' } : t);
      });
      queryClient.setQueryData(['task', id], (old: any) => {
        if (!old) return old;
        return { ...old, status: 'completed' };
      });

      db.runSync(`UPDATE tasks SET status = 'completed', updated_at = ? WHERE id = ?`, [now, task.id]);
      queueOperation('tasks', 'UPDATE', { id: task.id, status: 'completed', updated_at: now });

      const completionId = uuid.v4();
      db.runSync(
        `INSERT INTO task_completions (id, task_id, user_id, date, completed_at, state, xp_awarded, created_at)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`,
        [completionId, task.id, user?.id || '', dateStr, now, xp, now]
      );
      queueOperation('task_completions', 'INSERT', {
        id: completionId, task_id: task.id, user_id: user?.id || '', date: dateStr, completed_at: now, state: 'completed', xp_awarded: xp, created_at: now
      });

      // Check if this completes the week
      if (task.target_week) {
        const weekTasks = db.getAllSync<any>(
          'SELECT status FROM tasks WHERE routine_id = ? AND target_week = ?',
          [task.routine_id, task.target_week]
        );
        const allCompleted = weekTasks.length > 0 && weekTasks.every(t => t.status === 'completed');
        
        if (allCompleted) {
          const rwId = uuid.v4();
          db.runSync(`
            INSERT OR IGNORE INTO routine_weeks (id, routine_id, week_number, is_completed, completed_at, created_at, updated_at)
            VALUES (?, ?, ?, 1, ?, ?, ?)
          `, [rwId, task.routine_id, task.target_week, now, now, now]);
          queueOperation('routine_weeks', 'INSERT', {
            id: rwId, routine_id: task.routine_id, week_number: task.target_week, is_completed: 1, completed_at: now, created_at: now, updated_at: now
          });
          queryClient.invalidateQueries({ queryKey: ['routine_weeks', task.routine_id] });
        }
      }

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['completions'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });

      // Check for newly unlocked badges
      const unlocked = checkAndAwardBadges(user?.id || '');
      const badgeMsg = unlocked.length > 0
        ? `\n\n🏅 Badge unlocked: ${unlocked.join(', ')}!`
        : '';

      Alert.alert('Done! ✅', `+${xp} XP earned. Keep grinding.${badgeMsg}`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipConfirm = () => {
    const reason = selectedReason === 'Other' ? customReason : selectedReason;
    if (!reason.trim()) {
      Alert.alert('Required', 'Please select or enter a reason');
      return;
    }
    // Optimistic updates
    queryClient.setQueryData(['tasks', task.routine_id], (old: any) => {
      if (!old) return old;
      return old.map((t: any) => t.id === task.id ? { ...t, status: 'skipped' } : t);
    });
    queryClient.setQueryData(['task', id], (old: any) => {
      if (!old) return old;
      return { ...old, status: 'skipped' };
    });

    processTaskMiss(task, user?.id || '', reason);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['completions'] });
    setSkipModalVisible(false);
    router.back();
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'critical': return COLORS.warning;
      case 'high': return COLORS.txt;
      case 'medium': return COLORS.txt2;
      default: return COLORS.txt2;
    }
  };

  const getPriorityBgColor = () => {
    switch (task.priority) {
      case 'critical': return 'rgba(255, 165, 2, 0.1)';
      case 'high': return COLORS.lightMint;
      case 'medium': return COLORS.bg;
      default: return COLORS.bg;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          {task.is_recovery_task === 1 && (
            <View style={styles.recoveryBadge}>
              <Text style={styles.recoveryBadgeText}>⚡ RECOVERY TASK</Text>
            </View>
          )}
          <Text style={styles.title}>{task.title}</Text>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={[styles.priorityChip, { borderColor: getPriorityColor(), backgroundColor: getPriorityBgColor() }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor() }]}>
              {task.priority?.toUpperCase()}
            </Text>
          </View>
          {task.scheduled_time && (
            <Text style={styles.metaText}>🕐 {task.scheduled_time}</Text>
          )}
          {task.estimated_duration_minutes && (
            <Text style={styles.metaText}>⏱ {task.estimated_duration_minutes} min</Text>
          )}
        </View>

        {/* Description */}
        {task.description && (
          <FloatingCard style={styles.descBox}>
            <Text style={styles.descText}>{task.description}</Text>
          </FloatingCard>
        )}

        {/* Consequence Weight */}
        <View style={styles.statRow}>
          <FloatingCard style={styles.stat}>
            <Text style={styles.statLabel}>Consequence Weight</Text>
            <Text style={styles.statValue}>{task.consequence_weight?.toFixed(1) ?? '1.0'}×</Text>
          </FloatingCard>
          <FloatingCard style={styles.stat}>
            <Text style={styles.statLabel}>Category</Text>
            <Text style={styles.statValue}>{task.category || '—'}</Text>
          </FloatingCard>
        </View>

        {/* Status Banner */}
        {isDone && (
          <FloatingCard style={[styles.doneBanner, { backgroundColor: COLORS.lightMint }]}>
            <Text style={styles.doneBannerText}>✅ Completed</Text>
          </FloatingCard>
        )}
        {isSkipped && (
          <FloatingCard style={[styles.skippedBanner, { backgroundColor: 'rgba(255, 71, 87, 0.1)' }]}>
            <Text style={styles.skippedBannerText}>❌ Skipped — recovery scheduled</Text>
          </FloatingCard>
        )}
      </ScrollView>

      {/* Action Footer */}
      {!isDone && !isSkipped && (
        <View style={styles.footer}>
          <Button
            title="Skip"
            variant="outline-dark"
            onPress={() => setSkipModalVisible(true)}
            style={{ flex: 1 }}
          />
          <Button
            title="Complete ✓"
            onPress={handleComplete}
            loading={loading}
            style={{ flex: 2, marginLeft: 16, backgroundColor: COLORS.txt }}
          />
        </View>
      )}

      {/* Skip Reason Modal */}
      <Modal visible={skipModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Why are you skipping?</Text>
            {SKIP_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonRow, selectedReason === r && styles.reasonRowSelected]}
                onPress={() => setSelectedReason(r)}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, selectedReason === r && styles.radioSelected]} />
                <Text style={[styles.reasonText, selectedReason === r && { ...TYPOGRAPHY.bodyBold, color: COLORS.txt }]}>{r}</Text>
              </TouchableOpacity>
            ))}
            {selectedReason === 'Other' && (
              <TextInput
                style={styles.customInput}
                placeholder="Describe..."
                placeholderTextColor={COLORS.txt2}
                value={customReason}
                onChangeText={setCustomReason}
              />
            )}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
              <Button title="Cancel" variant="outline-dark" onPress={() => setSkipModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Confirm Skip" onPress={handleSkipConfirm} style={{ flex: 1, backgroundColor: COLORS.danger }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 24, paddingBottom: 60 },
  backBtn: { marginBottom: 24, alignSelf: 'flex-start' },
  backText: { ...TYPOGRAPHY.bodyBold, color: COLORS.txt2 },
  header: { marginBottom: 24 },
  recoveryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.lightMint,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  recoveryBadgeText: { ...TYPOGRAPHY.caption, color: COLORS.txt, letterSpacing: 1 },
  title: { ...TYPOGRAPHY.display },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 },
  priorityChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priorityText: { ...TYPOGRAPHY.caption, letterSpacing: 1 },
  metaText: { ...TYPOGRAPHY.body, color: COLORS.txt2 },
  descBox: {
    marginBottom: 24,
    padding: 20,
  },
  descText: { ...TYPOGRAPHY.body, color: COLORS.txt, lineHeight: 24 },
  statRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  stat: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  statLabel: { ...TYPOGRAPHY.caption, color: COLORS.txt2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { ...TYPOGRAPHY.h1, color: COLORS.txt },
  doneBanner: {
    padding: 20,
    alignItems: 'center',
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  doneBannerText: { ...TYPOGRAPHY.h2, color: COLORS.txt },
  skippedBanner: {
    padding: 20,
    alignItems: 'center',
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
  skippedBannerText: { ...TYPOGRAPHY.h2, color: COLORS.danger },
  footer: { 
    flexDirection: 'row', 
    padding: 24, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    ...SHADOWS.floating,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 60,
    ...SHADOWS.active,
  },
  modalTitle: { ...TYPOGRAPHY.h1, marginBottom: 24 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg,
    gap: 16,
  },
  reasonRowSelected: { borderBottomColor: COLORS.txt },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.txt2,
  },
  radioSelected: { backgroundColor: COLORS.txt, borderColor: COLORS.txt },
  reasonText: { ...TYPOGRAPHY.body, color: COLORS.txt },
  customInput: {
    marginTop: 16,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 16,
    ...TYPOGRAPHY.body,
    color: COLORS.txt,
  },
});
