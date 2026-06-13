import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY, SHADOWS } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { FloatingCard } from '../../src/components/ui/FloatingCard';
import { useUser, useAllActiveRoutines, useWeeklyReport } from '../../src/hooks/useQueries';
import { generateWeeklyReport } from '../../src/services/behavior/weeklyReportGenerator';
import { useAlert } from '../../src/components/ui/AlertProvider';

export default function ReviewScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const { data: routines } = useAllActiveRoutines(user?.id);
  const routine = routines?.[0];
  const { data: report, isLoading: reportLoading } = useWeeklyReport(user?.id);
  const [isGenerating, setIsGenerating] = useState(false);
  const { showAlert } = useAlert();

  const handleGenerate = () => {
    if (!user?.id || !routine?.id) return;
    setIsGenerating(true);
    try {
      generateWeeklyReport(user.id, routine.id);
      queryClient.invalidateQueries({ queryKey: ['weekly_report'] });
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRebuild = () => {
    showAlert(
      'Rebuild Routine',
      'This will archive your current routine and walk you through generating a new one. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Rebuild', 
          style: 'destructive',
          onPress: () => {
            router.push('/(auth)/onboarding');
          }
        }
      ]
    );
  };

  if (reportLoading) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Weekly Review</Text>
            {report && (
              <Text style={[styles.dateRange, { marginBottom: 0, marginTop: 4 }]}>
                {new Date(report.weekStart).toLocaleDateString()} – {new Date(report.weekEnd).toLocaleDateString()}
              </Text>
            )}
          </View>
          <Button 
            title={report ? "Refresh" : "Run Analysis"} 
            onPress={handleGenerate} 
            loading={isGenerating}
            variant="outline-dark"
          />
        </View>

        {!report ? (
          <FloatingCard style={styles.empty}>
            <Text style={styles.icon}>📊</Text>
            <Text style={styles.emptyText}>No report generated yet. Tap to run analysis on your recent behavior.</Text>
          </FloatingCard>
        ) : (
          <View>
            {/* ─── Stats ─── */}
            <View style={styles.statsGrid}>
              <StatCard label="Consistency" value={`${report.consistencyScore}%`} />
              <StatCard label="Tasks Done" value={`${report.tasksCompleted}`} />
              <StatCard label="Tasks Missed" value={`${report.tasksMissed}`} />
              <StatCard label="Recovery" value={`${report.recoveryCompleted}`} />
            </View>

            {/* ─── Pattern Analysis ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionHead}>Behavior Patterns</Text>
              <FloatingCard padding={0}>
                <PatternRow label="Worst Day" value={report.pattern.worstDayOfWeek || 'None'} />
                <PatternRow label="Worst Time" value={report.pattern.worstTimeOfDay ? report.pattern.worstTimeOfDay.toUpperCase() : 'None'} />
                <PatternRow label="Most Skipped" value={report.pattern.mostSkippedCategory || 'None'} />
                <PatternRow label="Consecutive Misses" value={`${report.pattern.consecutiveMissDays} days`} />
                <PatternRow label="Critical Tasks Missed" value={`${report.pattern.missedCriticalCount}`} noBorder />
              </FloatingCard>
            </View>

            {/* ─── Suggestions ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionHead}>Actionable Suggestions</Text>
              {report.suggestions.length === 0 ? (
                <Text style={styles.bodyText}>Keep up the good work! No major issues detected.</Text>
              ) : (
                report.suggestions.map((s: any, idx: number) => (
                  <FloatingCard key={idx} style={[styles.suggestionCard, s.severity === 'critical' && styles.criticalCard]}>
                    <View style={styles.suggestionHeader}>
                      <Text style={[styles.suggestionType, s.severity === 'critical' && { color: COLORS.warning }]}>
                        {s.type.toUpperCase().replace('_', ' ')}
                      </Text>
                      {s.severity === 'critical' && <Text style={{ fontSize: 16 }}>⚠️</Text>}
                    </View>
                    <Text style={styles.suggestionTitle}>{s.title}</Text>
                    <Text style={styles.suggestionDesc}>{s.description}</Text>
                    
                    {s.type === 'rebuild' && (
                      <Button 
                        title="Rebuild Routine" 
                        onPress={handleRebuild} 
                        style={{ marginTop: 16, backgroundColor: COLORS.warning }}
                      />
                    )}
                  </FloatingCard>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <FloatingCard style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </FloatingCard>
  );
}

function PatternRow({ label, value, noBorder = false }: { label: string; value: string; noBorder?: boolean }) {
  return (
    <View style={[styles.patternRow, !noBorder && styles.patternRowBorder]}>
      <Text style={styles.patternLabel}>{label}</Text>
      <Text style={styles.patternValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 24, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { ...TYPOGRAPHY.display, fontSize: 28 },
  dateRange: { ...TYPOGRAPHY.small, color: COLORS.txt2, marginBottom: 24, marginTop: -16 },
  
  empty: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginTop: 32,
    gap: 16,
  },
  icon: { fontSize: 48 },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.txt2, textAlign: 'center' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  statCard: {
    flex: 1, 
    minWidth: '45%',
    alignItems: 'center',
    padding: 20,
  },
  statValue: { ...TYPOGRAPHY.display, fontSize: 24, marginBottom: 4, color: COLORS.txt },
  statLabel: { ...TYPOGRAPHY.small, color: COLORS.txt2 },

  section: { marginBottom: 32 },
  sectionHead: { ...TYPOGRAPHY.caption, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16, color: COLORS.txt2 },
  
  patternRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20 },
  patternRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.bg },
  patternLabel: { ...TYPOGRAPHY.body, color: COLORS.txt2 },
  patternValue: { ...TYPOGRAPHY.bodyBold, color: COLORS.txt },

  suggestionCard: {
    marginBottom: 16,
  },
  criticalCard: { borderColor: COLORS.warning, borderWidth: 2 },
  suggestionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  suggestionType: { ...TYPOGRAPHY.caption, color: COLORS.txt, fontWeight: '700', letterSpacing: 1 },
  suggestionTitle: { ...TYPOGRAPHY.h2, fontSize: 16, marginBottom: 8 },
  suggestionDesc: { ...TYPOGRAPHY.body, color: COLORS.txt2, lineHeight: 22 },
  bodyText: { ...TYPOGRAPHY.body, color: COLORS.txt2 },
});
