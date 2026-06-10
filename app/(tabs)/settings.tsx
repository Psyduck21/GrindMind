import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { db } from '../../src/db/db';
import { COLORS, TYPOGRAPHY } from '../../src/constants/theme';
import { CircularProgress } from '../../src/components/ui/CircularProgress';
import { getTotalXp } from '../../src/services/gamification/xpEngine';
import { calculateStreak } from '../../src/services/scoring/streakCalculator';
import { calculatePromiseKeptRate } from '../../src/services/scoring/scoreEngine';
import { getAchievements } from '../../src/services/gamification/badgeEngine';
import { getLevelInfo } from '../../src/constants/xpConfig';
import { BADGE_DEFINITIONS } from '../../src/constants/badgeDefinitions';
import { supabase } from '../../src/supabase/client';

export default function ProfileScreen() {
  const router = useRouter();
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => db.getFirstSync<any>('SELECT * FROM users LIMIT 1'),
  });

  const stats = useMemo(() => {
    if (!user?.id) return null;
    const xp = getTotalXp(user.id);
    const streak = calculateStreak(user.id);
    const promiseKept = calculatePromiseKeptRate(user.id);
    const { current, next, progress } = getLevelInfo(xp);
    const achievements = getAchievements(user.id);

    const completions = db.getAllSync<any>(
      'SELECT * FROM task_completions WHERE user_id = ?',
      [user.id]
    );
    const totalCompleted = completions.filter((c) => c.state === 'completed').length;
    const totalSkipped = completions.filter((c) => c.state === 'skipped').length;

    return { xp, streak, promiseKept, current, next, progress, achievements, totalCompleted, totalSkipped };
  }, [user?.id]);

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (!user || !stats) return null;

  const modeLabel: Record<string, string> = {
    friendly: 'Friendly 😊',
    coach: 'Coach 💪',
    military: 'Military 🎖️',
    savage: 'Savage 🔥',
    iron_discipline: 'Iron Discipline ☠️',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ─── Header ─── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.goal}>{user.primary_goal?.toUpperCase()}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 8 }}>
            <View style={styles.modePill}>
              <Text style={styles.modeText}>{modeLabel[user.accountability_mode] || user.accountability_mode}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Text style={{ fontSize: 20 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Level Card ─── */}
        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <View>
              <Text style={styles.levelTitle}>Level {stats.current.level}</Text>
              <Text style={styles.levelLabel}>{stats.current.title}</Text>
            </View>
            {stats.next && (
              <Text style={styles.nextLevel}>→ {stats.next.title} at {stats.next.minXp} XP</Text>
            )}
          </View>
          {/* XP progress bar */}
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${stats.progress * 100}%` }]} />
          </View>
          <Text style={styles.xpLabel}>{stats.xp} XP total</Text>
        </View>

        {/* ─── Stats Grid ─── */}
        <View style={styles.statsGrid}>
          <StatCard icon="🔥" label="Streak" value={`${stats.streak}d`} />
          <StatCard icon="📊" label="Promise Kept" value={`${stats.promiseKept}%`} />
          <StatCard icon="✅" label="Completed" value={`${stats.totalCompleted}`} />
          <StatCard icon="❌" label="Skipped" value={`${stats.totalSkipped}`} />
        </View>

        {/* ─── Achievements ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionHead}>Achievements</Text>
          <View style={styles.badgeGrid}>
            {BADGE_DEFINITIONS.map((def) => {
              const earned = stats.achievements.find((a: any) => a.badge_name === def.id);
              return (
                <TouchableOpacity
                  key={def.id}
                  style={[styles.badgeCard, !earned && styles.badgeCardLocked]}
                  onPress={() => Alert.alert(
                    earned ? `${def.icon} ${def.name}` : '🔒 Locked',
                    earned ? def.description : `Unlock condition: ${def.description}`
                  )}
                >
                  <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
                    {earned ? def.icon : '🔒'}
                  </Text>
                  <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
                    {def.name}
                  </Text>
                  {earned && def.xpReward > 0 && (
                    <Text style={styles.badgeXp}>+{def.xpReward} XP</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Account ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionHead}>Account</Text>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 48 },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.s3,
    borderWidth: 1.5,
    borderColor: COLORS.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...TYPOGRAPHY.display, fontSize: 20 },
  name: { ...TYPOGRAPHY.title },
  goal: { ...TYPOGRAPHY.small, color: COLORS.txt3, letterSpacing: 1 },
  modePill: {
    marginLeft: 'auto',
    backgroundColor: COLORS.s2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modeText: { ...TYPOGRAPHY.small, color: COLORS.txt2 },

  levelCard: {
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  levelTitle: { ...TYPOGRAPHY.display, fontSize: 20 },
  levelLabel: { ...TYPOGRAPHY.small, color: COLORS.txt2 },
  nextLevel: { ...TYPOGRAPHY.small, color: COLORS.txt3 },
  xpTrack: {
    height: 6,
    backgroundColor: COLORS.s3,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.grn,
    borderRadius: 3,
  },
  xpLabel: { ...TYPOGRAPHY.small, color: COLORS.txt3, textAlign: 'right' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { ...TYPOGRAPHY.display, fontSize: 22 },
  statLabel: { ...TYPOGRAPHY.small, color: COLORS.txt3 },

  section: { marginBottom: 20 },
  sectionHead: {
    ...TYPOGRAPHY.small,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    color: COLORS.txt2,
  },

  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    width: '30%',
    flex: 1,
    minWidth: '28%',
    backgroundColor: COLORS.s1,
    borderWidth: 1,
    borderColor: COLORS.grnBdr,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  badgeCardLocked: {
    borderColor: COLORS.border,
    opacity: 0.45,
  },
  badgeIcon: { fontSize: 26 },
  badgeIconLocked: { opacity: 0.5 },
  badgeName: {
    ...TYPOGRAPHY.small,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 10,
  },
  badgeNameLocked: { color: COLORS.txt3 },
  badgeXp: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.grnHi,
  },

  signOutBtn: {
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { ...TYPOGRAPHY.body, color: COLORS.danger },
});
