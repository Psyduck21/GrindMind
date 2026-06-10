import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../../src/db/db';
import { COLORS, TYPOGRAPHY } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { processTaskMiss } from '../../src/services/consequence/consequenceEngine';
import { getXpForTask } from '../../src/services/scoring/streakCalculator';
import { checkAndAwardBadges } from '../../src/services/gamification/badgeEngine';
import uuid from 'react-native-uuid';
import { getLocalYYYYMMDD } from '../../src/utils/date';

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

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.grn} />;
  if (!task) return null;

  const isDone = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

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
      db.runSync(
        `INSERT INTO task_completions (id, task_id, user_id, date, completed_at, state, xp_awarded, created_at)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`,
        [uuid.v4(), task.id, user?.id || '', dateStr, now, xp, now]
      );

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
      case 'critical': return COLORS.danger;
      case 'high': return COLORS.txt;
      case 'medium': return COLORS.txt2;
      default: return COLORS.txt3;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
          <View style={[styles.priorityChip, { borderColor: getPriorityColor() }]}>
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
          <View style={styles.descBox}>
            <Text style={styles.descText}>{task.description}</Text>
          </View>
        )}

        {/* Consequence Weight */}
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Consequence Weight</Text>
            <Text style={styles.statValue}>{task.consequence_weight?.toFixed(1) ?? '1.0'}×</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Category</Text>
            <Text style={styles.statValue}>{task.category || '—'}</Text>
          </View>
        </View>

        {/* Status Banner */}
        {isDone && (
          <View style={styles.doneBanner}>
            <Text style={styles.doneBannerText}>✅ Completed</Text>
          </View>
        )}
        {isSkipped && (
          <View style={styles.skippedBanner}>
            <Text style={styles.skippedBannerText}>❌ Skipped — recovery scheduled</Text>
          </View>
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
            style={{ flex: 2, marginLeft: 8, backgroundColor: COLORS.grn }}
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
              >
                <View style={[styles.radio, selectedReason === r && styles.radioSelected]} />
                <Text style={styles.reasonText}>{r}</Text>
              </TouchableOpacity>
            ))}
            {selectedReason === 'Other' && (
              <TextInput
                style={styles.customInput}
                placeholder="Describe..."
                placeholderTextColor={COLORS.txt3}
                value={customReason}
                onChangeText={setCustomReason}
              />
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Button title="Cancel" variant="outline-dark" onPress={() => setSkipModalVisible(false)} style={{ flex: 1 }} />
              <Button title="Confirm Skip" onPress={handleSkipConfirm} style={{ flex: 1, backgroundColor: COLORS.danger }} textStyle={{ color: '#fff' }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { ...TYPOGRAPHY.small, color: COLORS.txt2 },
  header: { marginBottom: 16 },
  recoveryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.grnPill,
    borderWidth: 1,
    borderColor: COLORS.grnBdr,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  recoveryBadgeText: { ...TYPOGRAPHY.small, fontSize: 9, fontWeight: '700', color: COLORS.grnHi, letterSpacing: 1 },
  title: { ...TYPOGRAPHY.display, fontSize: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  priorityChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  metaText: { ...TYPOGRAPHY.small, color: COLORS.txt2 },
  descBox: {
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  descText: { ...TYPOGRAPHY.body, color: COLORS.txt2, lineHeight: 20 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  statLabel: { ...TYPOGRAPHY.small, color: COLORS.txt3, marginBottom: 4 },
  statValue: { ...TYPOGRAPHY.bodyBold },
  doneBanner: {
    backgroundColor: COLORS.grnPill,
    borderWidth: 1,
    borderColor: COLORS.grnBdr,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  doneBannerText: { ...TYPOGRAPHY.bodyBold, color: COLORS.grnHi },
  skippedBanner: {
    backgroundColor: COLORS.s2,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  skippedBannerText: { ...TYPOGRAPHY.bodyBold, color: COLORS.danger },
  footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { ...TYPOGRAPHY.title, marginBottom: 16 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  reasonRowSelected: { borderBottomColor: COLORS.txt },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.txt3,
  },
  radioSelected: { backgroundColor: COLORS.txt, borderColor: COLORS.txt },
  reasonText: { ...TYPOGRAPHY.body },
  customInput: {
    marginTop: 8,
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    color: COLORS.txt,
    fontSize: 14,
  },
});
