import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Menu } from 'lucide-react-native';
import { db } from '../../src/db/db';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/constants/theme';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { getTotalXp } from '../../src/services/gamification/xpEngine';
import { calculateStreak } from '../../src/services/scoring/streakCalculator';
import { calculatePromiseKeptRate } from '../../src/services/scoring/scoreEngine';
import { getAchievements } from '../../src/services/gamification/badgeEngine';
import { getLevelInfo } from '../../src/constants/xpConfig';
import { BADGE_DEFINITIONS } from '../../src/constants/badgeDefinitions';
import { supabase } from '../../src/supabase/client';
import { useWeeklyCompletions, useUser } from '../../src/hooks/useQueries';
import { AnimatedLineChart } from '../../src/components/profile/AnimatedLineChart';
import { useAlert } from '../../src/components/ui/AlertProvider';

export default function ProfileScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: weeklyCompletions } = useWeeklyCompletions(user?.id);
  const { showAlert } = useAlert();

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
    showAlert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (!user || !stats) return null;

  const modeLabel: Record<string, string> = {
    friendly: 'Friendly',
    coach: 'Coach',
    military: 'Military',
    savage: 'Savage',
    iron_discipline: 'Iron Discipline',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ─── Top Bar ─── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.push('/preferences')} style={styles.settingsBtn} activeOpacity={0.7}>
            <Menu color={COLORS.txt} size={28} />
          </TouchableOpacity>
        </View>

        {/* ─── Premium Header ─── */}
        <View style={styles.profileHeader}>
          <Text style={styles.nameHeading}>{user.name}</Text>
          <View style={styles.modePill}>
            <Text style={styles.modeText}>{modeLabel[user.accountability_mode] || user.accountability_mode}</Text>
          </View>
        </View>
        {/* ─── Animated Analytics Chart ─── */}
        <AnimatedLineChart data={weeklyCompletions || []} />

        {/* ─── Core Stats Grid ─── */}
        <View style={styles.statsGrid}>
          <StatCard label="Day Streak" value={`${stats.streak}`} />
          <StatCard label="Promise Kept" value={`${stats.promiseKept}%`} />
          <StatCard label="Completed" value={`${stats.totalCompleted}`} />
        </View>

        {/* ─── Level Progression ─── */}
        <FloatingCard style={styles.levelCard}>
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
        </FloatingCard>

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
                  onPress={() => showAlert(
                    earned ? `${def.icon} ${def.name}` : '🔒 Locked',
                    earned ? def.description : `Unlock condition: ${def.description}`
                  )}
                  activeOpacity={0.7}
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

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <FloatingCard style={styles.statCard} padding={16}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 24, paddingBottom: 100 },

  topBar: {
    alignItems: 'flex-end',
    marginBottom: -10,
    zIndex: 10,
  },
  settingsBtn: {
    padding: 8,
  },
  profileHeader: {
    marginBottom: 32,
    alignItems: 'center',
    marginTop: 0,
  },
  nameHeading: {
    ...TYPOGRAPHY.display,
    fontSize: 40,
    color: COLORS.txt,
    textAlign: 'center',
    marginBottom: 12,
  },
  modePill: {
    backgroundColor: COLORS.lightMint,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(20, 200, 181, 0.2)',
  },
  modeText: { 
    ...TYPOGRAPHY.h3, 
    color: COLORS.txt 
  },

  levelCard: {
    marginBottom: 32,
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  levelTitle: { ...TYPOGRAPHY.display, fontSize: 24, color: COLORS.txt },
  levelLabel: { ...TYPOGRAPHY.bodyBold, color: COLORS.txt },
  nextLevel: { ...TYPOGRAPHY.caption, color: COLORS.txt2, marginTop: 8 },
  xpTrack: {
    height: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  xpLabel: { ...TYPOGRAPHY.small, color: COLORS.txt2, textAlign: 'right' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { ...TYPOGRAPHY.h2 },
  statLabel: { ...TYPOGRAPHY.caption, color: COLORS.txt2, textAlign: 'center' },

  section: { marginBottom: 32 },
  sectionHead: {
    ...TYPOGRAPHY.h2,
    marginBottom: 16,
    color: COLORS.txt,
  },

  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '30%',
    flex: 1,
    minWidth: '28%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    ...SHADOWS.floating,
  },
  badgeCardLocked: {
    backgroundColor: COLORS.bg,
    elevation: 0,
    shadowOpacity: 0,
    opacity: 0.6,
  },
  badgeIcon: { fontSize: 32, marginBottom: 4 },
  badgeIconLocked: { opacity: 0.5 },
  badgeName: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeNameLocked: { color: COLORS.txt2 },
  badgeXp: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.txt,
  },

});
