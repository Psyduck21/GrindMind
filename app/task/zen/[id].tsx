import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../src/db/db';
import { COLORS, TYPOGRAPHY } from '../../../src/constants/theme';
import { useAbsoluteTimer } from '../../../src/hooks/useAbsoluteTimer';
import { CircularProgress } from '../../../src/components/ui/CircularProgress';
import { Play, Pause, X } from 'lucide-react-native';
import { getLocalYYYYMMDD } from '../../../src/utils/date';
import { getXpForTask } from '../../../src/services/scoring/streakCalculator';
import { queueOperation } from '../../../src/services/sync/syncEngine';
import { checkAndAwardBadges } from '../../../src/services/gamification/badgeEngine';
import { useAlert } from '../../../src/components/ui/AlertProvider';
import uuid from 'react-native-uuid';

export default function ZenModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: async () => await db.getFirstAsync<any>('SELECT * FROM tasks WHERE id = ?', [id]),
    enabled: !!id,
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => await db.getFirstAsync<any>('SELECT * FROM users LIMIT 1'),
  });

  // Default to 25 minutes (Pomodoro) if no duration is set
  const durationMinutes = task?.estimated_duration_minutes || 25;
  const { formattedTime, progress, isActive, start, pause, timeRemainingMs } = useAbsoluteTimer(durationMinutes);

  useEffect(() => {
    // Auto-start Zen Mode
    if (task && !isActive && timeRemainingMs > 0) {
      start();
    }
  }, [task]);

  const handleComplete = async () => {
    if (!task || loading) return;
    setLoading(true);
    
    try {
      const now = Date.now();
      const dateStr = getLocalYYYYMMDD();
      const xp = getXpForTask(task.priority, task.is_recovery_task === 1, task.is_gamified === 1);

      await db.runAsync(`UPDATE tasks SET status = 'completed', updated_at = ? WHERE id = ?`, [now, task.id]);
      queueOperation('tasks', 'UPDATE', { id: task.id, status: 'completed', updated_at: now });

      const completionId = uuid.v4();
      await db.runAsync(
        `INSERT INTO task_completions (id, task_id, user_id, date, completed_at, state, xp_awarded, created_at)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)`,
        [completionId, task.id, user?.id || '', dateStr, now, xp, now]
      );
      queueOperation('task_completions', 'INSERT', {
        id: completionId, task_id: task.id, user_id: user?.id || '', date: dateStr, completed_at: now, state: 'completed', xp_awarded: xp, created_at: now
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });

      const unlocked = await checkAndAwardBadges(user?.id || '');
      const badgeMsg = unlocked.length > 0
        ? `\n\n🏅 Badge unlocked: ${unlocked.join(', ')}!`
        : '';
        
      showAlert('Done! ✅', `+${xp} XP earned. Keep grinding.${badgeMsg}`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (taskLoading || !task) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.white} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <X color={COLORS.txt2} size={28} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={styles.subtitle}>Deep Work Session</Text>

        <View style={styles.timerContainer}>
          <CircularProgress 
            size={280}
            strokeWidth={12}
            progress={progress}
            color={timeRemainingMs === 0 ? COLORS.primary : COLORS.white}
          />
          <View style={styles.timeTextContainer}>
            <Text style={styles.timeText}>{formattedTime}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.playPauseBtn} 
            onPress={isActive ? pause : start}
          >
            {isActive ? <Pause color={COLORS.bg} size={32} /> : <Play color={COLORS.bg} size={32} style={{ marginLeft: 4 }} />}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.completeBtn}
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text style={styles.completeBtnText}>Complete Task</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg, // Pitch black or dark background
  },
  header: {
    padding: 24,
    alignItems: 'flex-start',
  },
  iconBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.txt2,
    marginBottom: 48,
  },
  timerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  timeTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 64,
    color: COLORS.white,
    letterSpacing: 2,
  },
  controls: {
    alignItems: 'center',
  },
  playPauseBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 24,
  },
  completeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  completeBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  }
});
